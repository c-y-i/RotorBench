"""
Utility module for converting 3D model files to GLTF/GLB format.
Supports STEP, STP, SLDPRT, and other CAD formats.
"""
import pathlib
import hashlib
import trimesh
import time
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)

# Supported input formats
SUPPORTED_FORMATS = {'.step', '.stp', '.stl', '.obj', '.ply', '.off', '.dae', '.3mf', '.sldprt'}

# Check for STEP file support backends
STEP_SUPPORT_AVAILABLE = False
STEP_BACKEND = None

try:
    import cascadio
    STEP_SUPPORT_AVAILABLE = True
    STEP_BACKEND = 'cascadio'
    logger.info("STEP file support: cascadio available")
except ImportError:
    try:
        # Try pythonocc-core as alternative
        from OCC.Core import STEPControl_Reader
        STEP_SUPPORT_AVAILABLE = True
        STEP_BACKEND = 'pythonocc'
        logger.info("STEP file support: pythonocc-core available")
    except ImportError:
        logger.warning("STEP file support: No backend available (cascadio or pythonocc-core required)")

class ModelConverter:
    """Handles conversion of 3D model files to GLTF format with caching."""
    
    def __init__(self, asset_root: pathlib.Path, cache_root: pathlib.Path, cache_ttl_hours: int = 24):
        """
        Initialize the model converter.
        
        Args:
            asset_root: Root directory containing source model files
            cache_root: Directory for storing converted GLTF files
            cache_ttl_hours: Time to live for cached files in hours (default: 24)
        """
        self.asset_root = asset_root
        self.cache_root = cache_root
        self.cache_ttl_hours = cache_ttl_hours
        self.cache_root.mkdir(parents=True, exist_ok=True)
    
    def _get_cache_path(self, source_path: pathlib.Path, output_format: str = 'glb') -> pathlib.Path:
        """
        Generate a cache file path for a given source file.
        
        Args:
            source_path: Path to the source model file
            output_format: Output format ('glb' or 'gltf')
        
        Returns:
            Path to the cached file
        """
        # Create a hash of the file path for unique identification
        path_hash = hashlib.md5(str(source_path).encode()).hexdigest()
        return self.cache_root / f"{path_hash}.{output_format}"
    
    def _is_cache_valid(self, source_path: pathlib.Path, cache_path: pathlib.Path) -> bool:
        """
        Check if cached file exists, is newer than source, and hasn't expired.
        
        Args:
            source_path: Path to source file
            cache_path: Path to cached file
        
        Returns:
            True if cache is valid, False otherwise
        """
        if not cache_path.exists():
            return False
        
        # Check if cache has expired based on TTL
        cache_mtime = cache_path.stat().st_mtime
        current_time = time.time()
        cache_age_hours = (current_time - cache_mtime) / 3600
        
        if cache_age_hours > self.cache_ttl_hours:
            logger.info(f"Cache expired for {cache_path.name} (age: {cache_age_hours:.1f}h)")
            return False
        
        # Check if source file is newer than cache
        source_mtime = source_path.stat().st_mtime
        return cache_mtime >= source_mtime
    
    def convert_to_gltf(
        self, 
        source_path: pathlib.Path, 
        output_format: str = 'glb',
        force_reconvert: bool = False
    ) -> Optional[pathlib.Path]:
        """
        Convert a 3D model file to GLTF/GLB format.
        
        Args:
            source_path: Path to the source model file
            output_format: Output format ('glb' for binary, 'gltf' for JSON)
            force_reconvert: If True, ignore cache and reconvert
        
        Returns:
            Path to the converted file, or None if conversion failed
        """
        if not source_path.exists():
            logger.error(f"Source file not found: {source_path}")
            return None
        
        # Check file extension
        file_ext = source_path.suffix.lower()
        if file_ext not in SUPPORTED_FORMATS:
            logger.warning(f"Unsupported format: {file_ext}")
            return None
        
        # If source is already a GLB/GLTF file and output format matches, return it directly
        if file_ext in {'.glb', '.gltf'}:
            if output_format == 'glb' and file_ext == '.glb':
                logger.info(f"Source file is already GLB: {source_path}")
                return source_path
            elif output_format == 'gltf' and file_ext == '.gltf':
                logger.info(f"Source file is already GLTF: {source_path}")
                return source_path
        
        # Check cache
        cache_path = self._get_cache_path(source_path, output_format)
        if not force_reconvert and self._is_cache_valid(source_path, cache_path):
            logger.info(f"Using cached file: {cache_path}")
            return cache_path
        
        try:
            logger.info(f"Converting {source_path} to {output_format.upper()}")
            
            # For STEP files, check if we have support
            if file_ext in {'.step', '.stp', '.sldprt'}:
                if not STEP_SUPPORT_AVAILABLE:
                    logger.warning(f"STEP file conversion requested but no backend available. Creating placeholder...")
                    return self._create_placeholder_mesh(source_path, cache_path, output_format)
            
            # Load the mesh using trimesh
            # Trimesh supports STEP/STP files through pythonocc or other backends
            try:
                mesh = trimesh.load(str(source_path), force='mesh')
            except Exception as load_error:
                # If loading fails and it's a STEP file, try alternative methods
                if file_ext in {'.step', '.stp', '.sldprt'}:
                    logger.warning(f"Trimesh failed to load STEP file: {load_error}. Trying alternative...")
                    alt_result = self._convert_step_alternative(source_path, cache_path, output_format)
                    if alt_result:
                        return alt_result
                    # If alternative also fails, create placeholder
                    logger.warning(f"All STEP conversion methods failed, creating placeholder")
                    return self._create_placeholder_mesh(source_path, cache_path, output_format)
                # For non-STEP files, try to create placeholder as last resort
                logger.warning(f"Failed to load {file_ext} file: {load_error}. Creating placeholder...")
                return self._create_placeholder_mesh(source_path, cache_path, output_format)
            
            # Export mesh or scene
            # Trimesh's export method handles both meshes and scenes
            mesh.export(str(cache_path), file_type=output_format)
            
            logger.info(f"Successfully converted to: {cache_path}")
            return cache_path
            
        except Exception as e:
            logger.error(f"Failed to convert {source_path}: {str(e)}")
            # Try alternative conversion method for STEP files
            if file_ext in {'.step', '.stp', '.sldprt'}:
                alt_result = self._convert_step_alternative(source_path, cache_path, output_format)
                if alt_result:
                    return alt_result
                # If alternative also fails, create placeholder
                logger.warning(f"All STEP conversion methods failed, creating placeholder")
                return self._create_placeholder_mesh(source_path, cache_path, output_format)
            # For other formats, try creating a placeholder
            placeholder = self._create_placeholder_mesh(source_path, cache_path, output_format)
            if placeholder:
                return placeholder
            # If even placeholder creation fails, return None (shouldn't happen)
            logger.error(f"Even placeholder creation failed for {source_path}")
            return None
    
    def _convert_step_alternative(
        self, 
        source_path: pathlib.Path, 
        cache_path: pathlib.Path,
        output_format: str
    ) -> Optional[pathlib.Path]:
        """
        Alternative conversion method for STEP files if cascadio fails.
        Tries pythonocc-core as a fallback.
        
        Args:
            source_path: Path to source STEP file
            cache_path: Path to output cache file
            output_format: Output format
        
        Returns:
            Path to converted file or None
        """
        # Try pythonocc-core as fallback (if cascadio failed)
        try:
            from OCC.Core import STEPControl_Reader
            from OCC.Core import IFSelect_ReturnStatus
            from OCC.Core import BRepMesh_IncrementalMesh
            from OCC.Core import TopExp
            from OCC.Core import TopAbs
            from OCC.Core import BRep_Tool
            from OCC.Core import TopoDS
            
            reader = STEPControl_Reader()
            status = reader.ReadFile(str(source_path))
            
            if status == IFSelect_ReturnStatus.IFSelect_RetDone:
                reader.TransferRoots()
                shape = reader.OneShape()
                mesh = BRepMesh_IncrementalMesh(shape, 0.1, True)
                mesh.Perform()
                
                vertices = []
                faces = []
                
                exp = TopExp.TopExp_Explorer(shape, TopAbs.TopAbs_FACE)
                while exp.More():
                    face = TopoDS.topods_Face(exp.Current())
                    location = face.Location()
                    triangulation = BRep_Tool.Triangulation(face, location)
                    
                    if triangulation:
                        nodes = triangulation.Nodes()
                        triangles = triangulation.Triangles()
                        base_index = len(vertices)
                        
                        for i in range(1, nodes.Length() + 1):
                            node = nodes.Value(i)
                            vertices.append([node.X(), node.Y(), node.Z()])
                        
                        for i in range(1, triangles.Length() + 1):
                            triangle = triangles.Value(i)
                            n1, n2, n3 = triangle.Get()
                            faces.append([base_index + n1 - 1, base_index + n2 - 1, base_index + n3 - 1])
                    
                    exp.Next()
                
                if vertices and faces:
                    import numpy as np
                    mesh_obj = trimesh.Trimesh(vertices=np.array(vertices), faces=np.array(faces))
                    mesh_obj.export(str(cache_path), file_type=output_format)
                    logger.info(f"Successfully converted STEP using pythonocc: {cache_path}")
                    return cache_path
        except ImportError:
            pass
        except Exception as e:
            logger.warning(f"pythonocc conversion failed: {e}")
        
        # If all else fails, create a placeholder mesh
        logger.warning(f"All STEP conversion methods failed for {source_path}, creating placeholder")
        return self._create_placeholder_mesh(source_path, cache_path, output_format)
    
    def _create_placeholder_mesh(
        self,
        source_path: pathlib.Path,
        cache_path: pathlib.Path,
        output_format: str
    ) -> Optional[pathlib.Path]:
        """
        Create a simple placeholder mesh when conversion fails.
        This ensures the API doesn't fail completely and the frontend can still render something.
        
        Args:
            source_path: Path to source file (for naming)
            cache_path: Path to output cache file
            output_format: Output format
        
        Returns:
            Path to placeholder file
        """
        try:
            # Create a simple box as placeholder
            # Size based on file name hints if possible
            size = 1.0
            if 'frame' in source_path.stem.lower():
                size = 0.2  # Frames are typically larger
            elif 'motor' in source_path.stem.lower():
                size = 0.05  # Motors are small
            elif 'prop' in source_path.stem.lower():
                size = 0.1  # Propellers are medium
            
            placeholder = trimesh.creation.box(extents=[size, size, size * 0.5])
            placeholder.export(str(cache_path), file_type=output_format)
            logger.info(f"Created placeholder mesh for {source_path.name} at {cache_path}")
            return cache_path
        except Exception as e:
            logger.error(f"Failed to create placeholder mesh: {e}")
            return None
    
    def get_model_path(self, category: str, filename: str) -> Optional[pathlib.Path]:
        """
        Get the full path to a model file in the assets directory.
        Also checks for pre-converted GLB files and handles normalized URLs.
        
        Args:
            category: Component category (e.g., 'motors', 'frames')
            filename: Model filename (may be .glb if URL was normalized)
        
        Returns:
            Full path to the model file or None if not found
        """
        model_path = self.asset_root / category / filename
        if model_path.exists():
            return model_path
        
        # If a .glb file was requested but doesn't exist, check for source files
        # This handles cases where the frontend normalizes .step URLs to .glb
        if model_path.suffix.lower() == '.glb':
            # Try to find the original STEP/STP/SLDPRT file
            for ext in ['.step', '.stp', '.sldprt']:
                source_path = model_path.with_suffix(ext)
                if source_path.exists():
                    logger.info(f"Found source file for normalized GLB request: {source_path}")
                    return source_path
        
        # Check for pre-converted GLB file (same name but .glb extension)
        if model_path.suffix.lower() in {'.step', '.stp', '.sldprt'}:
            glb_path = model_path.with_suffix('.glb')
            if glb_path.exists():
                logger.info(f"Found pre-converted GLB file: {glb_path}")
                return glb_path
        
        return None
    
    def convert_component_model(
        self, 
        category: str, 
        filename: str,
        output_format: str = 'glb'
    ) -> Tuple[Optional[pathlib.Path], Optional[str]]:
        """
        Convert a component model to GLTF format.
        First checks for pre-converted files, then attempts conversion.
        
        Args:
            category: Component category
            filename: Model filename
            output_format: Output format ('glb' or 'gltf')
        
        Returns:
            Tuple of (converted_path, error_message)
        """
        # First, check if a pre-converted GLB file exists directly
        # This handles cases where GLB files are already in the assets directory
        glb_path = self.asset_root / category / filename
        if glb_path.suffix.lower() == '.glb' and glb_path.exists() and output_format == 'glb':
            # Check file size - placeholder meshes are typically very small (< 10KB)
            # Real converted models are usually much larger
            file_size = glb_path.stat().st_size
            if file_size > 10240:  # 10KB threshold
                logger.info(f"Found pre-converted GLB file: {glb_path} ({file_size} bytes)")
                # Copy to cache for consistency and return cached version
                cache_path = self._get_cache_path(glb_path, output_format)
                if not cache_path.exists() or not self._is_cache_valid(glb_path, cache_path):
                    import shutil
                    cache_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(glb_path, cache_path)
                    logger.info(f"Copied pre-converted GLB to cache: {cache_path}")
                return cache_path, None
            else:
                logger.warning(f"GLB file exists but appears to be a placeholder ({file_size} bytes). Will attempt conversion from source.")
        
        # Try to find the source file (may be STEP, STL, or pre-converted GLB)
        source_path = self.get_model_path(category, filename)
        if not source_path:
            return None, f"Model file not found: {category}/{filename}"
        
        # If we found a pre-converted GLB and that's what we need, return it
        if source_path.suffix.lower() == '.glb' and output_format == 'glb':
            # Copy to cache for consistency
            cache_path = self._get_cache_path(source_path, output_format)
            if not cache_path.exists() or not self._is_cache_valid(source_path, cache_path):
                import shutil
                cache_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source_path, cache_path)
                logger.info(f"Copied pre-converted GLB to cache: {cache_path}")
            return cache_path, None
        
        # Otherwise, attempt conversion
        converted_path = self.convert_to_gltf(source_path, output_format)
        if not converted_path:
            # Last resort: try to create a placeholder
            logger.warning(f"Conversion failed for {category}/{filename}, attempting placeholder creation")
            cache_path = self._get_cache_path(source_path, output_format)
            placeholder_path = self._create_placeholder_mesh(source_path, cache_path, output_format)
            if placeholder_path:
                logger.info(f"Using placeholder mesh for {category}/{filename}")
                return placeholder_path, None
            return None, f"Failed to convert model: {category}/{filename}"
        
        return converted_path, None
    
    def cleanup_expired_cache(self) -> int:
        """
        Remove expired cached files based on TTL.
        
        Returns:
            Number of files deleted
        """
        if not self.cache_root.exists():
            return 0
        
        deleted_count = 0
        current_time = time.time()
        ttl_seconds = self.cache_ttl_hours * 3600
        
        for cache_file in self.cache_root.iterdir():
            if cache_file.is_file():
                file_age_seconds = current_time - cache_file.stat().st_mtime
                if file_age_seconds > ttl_seconds:
                    try:
                        cache_file.unlink()
                        deleted_count += 1
                        logger.info(f"Deleted expired cache file: {cache_file.name}")
                    except Exception as e:
                        logger.error(f"Failed to delete cache file {cache_file.name}: {e}")
        
        logger.info(f"Cache cleanup completed: {deleted_count} files deleted")
        return deleted_count
    
    def clear_all_cache(self) -> int:
        """
        Remove all cached files.
        
        Returns:
            Number of files deleted
        """
        if not self.cache_root.exists():
            return 0
        
        deleted_count = 0
        for cache_file in self.cache_root.iterdir():
            if cache_file.is_file():
                try:
                    cache_file.unlink()
                    deleted_count += 1
                except Exception as e:
                    logger.error(f"Failed to delete cache file {cache_file.name}: {e}")
        
        logger.info(f"Cache cleared: {deleted_count} files deleted")
        return deleted_count
    
    def get_cache_stats(self) -> dict:
        """
        Get statistics about the cache directory.
        
        Returns:
            Dictionary with cache statistics
        """
        if not self.cache_root.exists():
            return {"total_files": 0, "total_size_mb": 0, "expired_files": 0}
        
        total_files = 0
        total_size = 0
        expired_files = 0
        current_time = time.time()
        ttl_seconds = self.cache_ttl_hours * 3600
        
        for cache_file in self.cache_root.iterdir():
            if cache_file.is_file():
                total_files += 1
                total_size += cache_file.stat().st_size
                file_age_seconds = current_time - cache_file.stat().st_mtime
                if file_age_seconds > ttl_seconds:
                    expired_files += 1
        
        return {
            "total_files": total_files,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "expired_files": expired_files,
            "cache_ttl_hours": self.cache_ttl_hours
        }

