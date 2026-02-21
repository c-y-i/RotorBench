"""
Main module for the RotorBench backend.
"""
from __future__ import annotations

import logging
import pathlib
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from models.components import (
    Battery,
    BuildAnalysis,
    ComponentDatabase,
    DroneBuild,
    DroneBuildConfig,
    ESC,
    FlightController,
    Frame,
    Motor,
    Propeller,
    Receiver,
)
from models.user import UserProfile
from settings import settings
from utils.build_analysis import analyze_build
from utils.component_data import (
    delete_build,
    get_all_batteries,
    get_all_components_db,
    get_all_escs,
    get_all_flight_controllers,
    get_all_frames,
    get_all_motors,
    get_all_propellers,
    get_all_receivers,
    get_all_saved_builds,
    get_component_by_id,
    hydrate_build,
    save_build,
)
from utils.data_migration import migrate_legacy_data_if_needed
from utils.data_paths import ensure_runtime_data_files
from utils.model_converter import ModelConverter
from utils.user_data import delete_user, get_user, list_users, save_user

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ASSET_ROOT = pathlib.Path(__file__).parent / "assets"
CACHE_ROOT = pathlib.Path(__file__).parent / "assets-cache"
SUPPORTED = {
    ".obj",
    ".stl",
    ".ply",
    ".off",
    ".dae",
    ".3mf",
    ".gltf",
    ".glb",
    ".step",
    ".stp",
    ".iges",
    ".igs",
}

# Cache TTL in hours (set to 0 to disable TTL, files only expire when source changes)
CACHE_TTL_HOURS = 24

# Initialize model converter with TTL
model_converter = ModelConverter(ASSET_ROOT, CACHE_ROOT, cache_ttl_hours=CACHE_TTL_HOURS)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("=" * 60)
    logger.info("RotorBench Backend Server Starting")
    logger.info("Environment: %s", settings.app_env)
    logger.info("Host/Port: %s:%s", settings.host, settings.port)
    logger.info("CORS allowed origins: %s", settings.cors_allowed_origins)
    logger.info("Docs enabled: %s", settings.enable_docs)
    logger.info("Cache TTL: %s hours", CACHE_TTL_HOURS)

    builds_file, users_file = ensure_runtime_data_files()
    logger.info("Runtime data files: builds=%s users=%s", builds_file, users_file)

    migration_result = migrate_legacy_data_if_needed()
    logger.info("Legacy data migration result: %s", migration_result)

    deleted = model_converter.cleanup_expired_cache()
    if deleted > 0:
        logger.info("Cleaned up %s expired cache file(s)", deleted)

    cache_stats = model_converter.get_cache_stats()
    logger.info(
        "Cache: %s files, %s MB",
        cache_stats["total_files"],
        cache_stats["total_size_mb"],
    )
    logger.info("=" * 60)

    yield

    logger.info("RotorBench Backend Server Shutting Down")


app = FastAPI(
    title="RotorBench API",
    version=settings.version,
    lifespan=lifespan,
    docs_url="/docs" if settings.enable_docs else None,
    redoc_url="/redoc" if settings.enable_docs else None,
    openapi_url="/openapi.json" if settings.enable_docs else None,
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    logger.info("%s %s -> %s", request.method, request.url.path, response.status_code)
    return response


@app.get("/")
async def root():
    return {
        "message": "RotorBench API is running!",
        "version": settings.version,
        "environment": settings.app_env,
    }


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "rotorbench",
        "version": settings.version,
        "environment": settings.app_env,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------
# Component endpoints
# ---------------------------

@app.get("/api/components", response_model=ComponentDatabase)
async def get_components():
    return get_all_components_db()


@app.get("/api/components/motors", response_model=List[Motor])
async def get_motors():
    return get_all_motors()


@app.get("/api/components/propellers", response_model=List[Propeller])
async def get_propellers():
    return get_all_propellers()


@app.get("/api/components/escs", response_model=List[ESC])
async def get_escs():
    return get_all_escs()


@app.get("/api/components/flight-controllers", response_model=List[FlightController])
async def get_flight_controllers():
    return get_all_flight_controllers()


@app.get("/api/components/frames", response_model=List[Frame])
async def get_frames():
    return get_all_frames()


@app.get("/api/components/batteries", response_model=List[Battery])
async def get_batteries():
    return get_all_batteries()


@app.get("/api/components/receivers", response_model=List[Receiver])
async def get_receivers():
    return get_all_receivers()


@app.get("/api/components/{component_type}/{component_id}")
async def get_component(component_type: str, component_id: str):
    component = get_component_by_id(component_type, component_id)
    if not component:
        raise HTTPException(status_code=404, detail="Component not found")
    return component


# ---------------------------
# Build endpoints (canonical)
# ---------------------------


def _get_build_or_404(build_id: str) -> DroneBuildConfig:
    for build in get_all_saved_builds():
        if build.id == build_id:
            return build
    raise HTTPException(status_code=404, detail="Build not found")


@app.get("/api/builds", response_model=List[DroneBuildConfig])
async def get_builds(userId: Optional[str] = Query(default=None)):
    builds = get_all_saved_builds()
    if userId:
        builds = [build for build in builds if build.user_id == userId]
    return builds


@app.post("/api/builds", response_model=DroneBuildConfig)
async def create_build(build_config: DroneBuildConfig):
    now = datetime.now(timezone.utc)

    existing: Optional[DroneBuildConfig] = None
    if build_config.id:
        for build in get_all_saved_builds():
            if build.id == build_config.id:
                existing = build
                break

    normalized = build_config.model_copy(
        update={
            "id": build_config.id or f"bld_{uuid.uuid4().hex[:10]}",
            "created_at": build_config.created_at or (existing.created_at if existing else now),
            "updated_at": now,
        }
    )

    return save_build(normalized)


@app.get("/api/builds/{build_id}", response_model=DroneBuildConfig)
async def get_build(build_id: str):
    return _get_build_or_404(build_id)


@app.put("/api/builds/{build_id}", response_model=DroneBuildConfig)
async def update_build(build_id: str, build_config: DroneBuildConfig):
    existing = _get_build_or_404(build_id)

    if build_config.id and build_config.id != build_id:
        raise HTTPException(status_code=400, detail="Build ID mismatch")

    now = datetime.now(timezone.utc)
    normalized = build_config.model_copy(
        update={
            "id": build_id,
            "created_at": build_config.created_at or existing.created_at or now,
            "updated_at": now,
        }
    )

    return save_build(normalized)


@app.delete("/api/builds/{build_id}")
async def delete_build_endpoint(build_id: str):
    success = delete_build(build_id)
    if not success:
        raise HTTPException(status_code=404, detail="Build not found")
    return {"message": "Build deleted successfully"}


@app.get("/api/builds/{build_id}/hydrated", response_model=DroneBuild)
async def get_hydrated_build(build_id: str):
    build_config = _get_build_or_404(build_id)

    hydrated = hydrate_build(build_config)
    if not hydrated:
        raise HTTPException(status_code=500, detail="Failed to hydrate build")

    return hydrated


@app.post("/api/builds/analyze", response_model=BuildAnalysis)
async def analyze_drone_build(build: DroneBuild):
    analysis = analyze_build(build)
    return analysis


@app.post("/api/builds/{build_id}/analyze", response_model=BuildAnalysis)
async def analyze_saved_build(build_id: str):
    build_config = _get_build_or_404(build_id)

    hydrated = hydrate_build(build_config)
    if not hydrated:
        raise HTTPException(status_code=500, detail="Failed to hydrate build")

    return analyze_build(hydrated)


# ---------------------------
# User endpoints
# ---------------------------

@app.get("/api/users", response_model=List[UserProfile])
async def api_list_users():
    return list_users()


@app.get("/api/users/{user_id}", response_model=UserProfile)
async def api_get_user(user_id: str):
    user = get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.post("/api/users")
async def api_create_or_login_user(profile: UserProfile):
    if not profile.email:
        raise HTTPException(status_code=400, detail="Email is required")

    users = list_users()
    now = datetime.now(timezone.utc)

    existing_user = next((u for u in users if u.email == profile.email), None)
    if existing_user:
        existing_user.updated_at = now
        save_user(existing_user)
        return {"user": existing_user, "isNew": False}

    if not profile.display_name or profile.display_name.strip() == "":
        import random
        import string

        random_suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        profile.display_name = f"User_{random_suffix}"

    profile.id = profile.id or str(uuid.uuid4())
    profile.created_at = profile.created_at or now
    profile.updated_at = now

    if not save_user(profile):
        raise HTTPException(status_code=500, detail="Failed to save user")

    return {"user": profile, "isNew": True}


@app.put("/api/users/{user_id}", response_model=UserProfile)
async def api_update_user(user_id: str, profile: UserProfile):
    if profile.id and user_id != profile.id:
        raise HTTPException(status_code=400, detail="User ID mismatch")

    existing = get_user(user_id)
    now = datetime.now(timezone.utc)

    profile.id = user_id
    profile.created_at = profile.created_at or (existing.created_at if existing else now)
    profile.updated_at = now

    if not save_user(profile):
        raise HTTPException(status_code=500, detail="Failed to update user")
    return profile


@app.delete("/api/users/{user_id}")
async def api_delete_user(user_id: str):
    if not delete_user(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}


# ---------------------------
# Model conversion and serving endpoints
# ---------------------------

@app.get("/api/models/convert/{category}/{filename}")
@app.head("/api/models/convert/{category}/{filename}")
async def convert_model(
    category: str,
    filename: str,
    format: str = Query(default="glb", pattern="^(glb|gltf)$"),
):
    logger.info("Converting model: %s/%s to %s", category, filename, format)

    converted_path, error = model_converter.convert_component_model(
        category=category,
        filename=filename,
        output_format=format,
    )

    if error or not converted_path or not converted_path.exists():
        raise HTTPException(status_code=404, detail=error or "Conversion failed")

    media_type = "model/gltf-binary" if format == "glb" else "model/gltf+json"

    return FileResponse(
        path=str(converted_path),
        media_type=media_type,
        filename=f"{pathlib.Path(filename).stem}.{format}",
    )


@app.get("/api/models/list/{category}")
async def list_models(category: str):
    category_path = ASSET_ROOT / category

    if not category_path.exists() or not category_path.is_dir():
        raise HTTPException(status_code=404, detail=f"Category not found: {category}")

    models = []
    for file_path in category_path.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in SUPPORTED:
            models.append(
                {
                    "filename": file_path.name,
                    "category": category,
                    "extension": file_path.suffix.lower(),
                    "size": file_path.stat().st_size,
                }
            )

    return {"category": category, "models": models}


@app.get("/api/models/categories")
async def list_categories():
    if not ASSET_ROOT.exists():
        raise HTTPException(status_code=500, detail="Assets directory not found")

    categories = []
    for category_path in ASSET_ROOT.iterdir():
        if category_path.is_dir():
            model_count = sum(
                1
                for f in category_path.iterdir()
                if f.is_file() and f.suffix.lower() in SUPPORTED
            )
            if model_count > 0:
                categories.append({"name": category_path.name, "model_count": model_count})

    return {"categories": categories}


@app.post("/api/models/batch-convert")
async def batch_convert_models(
    request: Dict[str, Any],
    format: str = Query(default="glb", pattern="^(glb|gltf)$"),
):
    models = request.get("models", [])
    if not models:
        raise HTTPException(status_code=400, detail="No models specified")

    results = []
    for model_info in models:
        category = model_info.get("category")
        filename = model_info.get("filename")

        if not category or not filename:
            results.append(
                {
                    "category": category,
                    "filename": filename,
                    "status": "error",
                    "error": "Missing category or filename",
                }
            )
            continue

        converted_path, error = model_converter.convert_component_model(
            category=category,
            filename=filename,
            output_format=format,
        )

        if error or not converted_path:
            results.append(
                {
                    "category": category,
                    "filename": filename,
                    "status": "error",
                    "error": error or "Conversion failed",
                }
            )
        else:
            results.append(
                {
                    "category": category,
                    "filename": filename,
                    "status": "success",
                    "download_url": f"/api/models/convert/{category}/{filename}?format={format}",
                }
            )

    return {"results": results}


@app.get("/api/models/cache/stats")
async def get_cache_stats():
    return model_converter.get_cache_stats()


@app.post("/api/models/cache/cleanup")
async def cleanup_cache():
    deleted_count = model_converter.cleanup_expired_cache()
    return {
        "message": "Cache cleanup completed",
        "deleted_files": deleted_count,
    }


@app.delete("/api/models/cache/clear")
async def clear_cache():
    deleted_count = model_converter.clear_all_cache()
    return {
        "message": "Cache cleared",
        "deleted_files": deleted_count,
    }


if __name__ == "__main__":
    uvicorn.run(app, host=settings.host, port=settings.port)
