"""
Pre-convert STEP files to GLB format using cascadio or pythonocc-core.
This script batch converts all STEP files to GLB for faster loading.

Usage:
    python preconvert_models.py
    
This will convert all STEP files in the assets directory to GLB format.
The converted GLB files will be placed alongside the original STEP files.
Note: Requires cascadio or pythonocc-core to be installed.
"""
import pathlib
import sys
import logging
from utils.model_converter import ModelConverter, STEP_SUPPORT_AVAILABLE, STEP_BACKEND

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def preconvert_all_models():
    """Pre-convert all STEP files to GLB format."""
    backend_dir = pathlib.Path(__file__).parent
    asset_root = backend_dir / "assets"
    cache_root = backend_dir / "assets-cache"
    
    if not asset_root.exists():
        logger.error(f"Assets directory not found: {asset_root}")
        return False
    
    converter = ModelConverter(asset_root, cache_root)
    
    # Find all STEP files
    step_files = []
    for category_dir in asset_root.iterdir():
        if not category_dir.is_dir():
            continue
        
        for file_path in category_dir.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in {'.step', '.stp', '.sldprt'}:
                step_files.append((category_dir.name, file_path))
    
    if not step_files:
        logger.info("No STEP files found to convert")
        return True
    
    logger.info(f"Found {len(step_files)} STEP file(s) to convert")
    
    if not STEP_SUPPORT_AVAILABLE:
        logger.warning("=" * 60)
        logger.warning("No STEP conversion backend available!")
        logger.warning("=" * 60)
        logger.warning("To enable STEP conversion, install one of:")
        logger.warning("  1. pip install cascadio>=0.0.17  (recommended, lightweight)")
        logger.warning("  2. pip install pythonocc-core>=7.7.0  (full support, larger)")
        logger.warning("")
        logger.warning("Alternatively, you can:")
        logger.warning("  - Use online converters (e.g., imagetostl.com, 3dpea.com)")
        logger.warning("  - Manually convert STEP files to GLB and place them")
        logger.warning("    alongside the STEP files (same name, .glb extension)")
        logger.warning("=" * 60)
        return False
    
    logger.info(f"Using backend: {STEP_BACKEND}")
    logger.info("")
    
    success_count = 0
    failed_count = 0
    
    for category, step_file in step_files:
        logger.info(f"Converting: {category}/{step_file.name}")
        
        # Convert to GLB
        converted_path, error = converter.convert_component_model(
            category=category,
            filename=step_file.name,
            output_format='glb'
        )
        
        if error or not converted_path:
            logger.error(f"  Failed: {error or 'Unknown error'}")
            failed_count += 1
        else:
            # Copy the converted file to the assets directory alongside the STEP file
            glb_file = step_file.with_suffix('.glb')
            try:
                import shutil
                shutil.copy2(converted_path, glb_file)
                logger.info(f"  Success: Created {glb_file.name}")
                success_count += 1
            except Exception as e:
                logger.error(f"  Failed to copy to assets: {e}")
                failed_count += 1
    
    logger.info("")
    logger.info("=" * 60)
    logger.info(f"Conversion complete: {success_count} succeeded, {failed_count} failed")
    logger.info("=" * 60)
    
    return failed_count == 0

if __name__ == "__main__":
    success = preconvert_all_models()
    sys.exit(0 if success else 1)

