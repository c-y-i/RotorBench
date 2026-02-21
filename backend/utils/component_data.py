"""
Utility functions for component data handling.
"""
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Optional
from models.components import (
    Motor, Propeller, ESC, FlightController,
    Frame, Battery, Receiver,
    ComponentDatabase, DroneBuild, DroneBuildConfig,
    DroneComponents
)

from utils.data_paths import LEGACY_FRONTEND_DATA_DIR, get_data_files

# Component catalog stays read-only in the legacy frontend data location for now.
COMPONENTS_FILE = LEGACY_FRONTEND_DATA_DIR / "components.json"
BUILDS_FILE, _USERS_FILE = get_data_files()


# ---------------------------
# Helpers
# ---------------------------

def _load_json(path: Path, default):
    if not path.exists():
        return default
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def _save_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)

def _ensure_component_ids(build: dict) -> dict:
    """
    Ensure the build dict contains a nested 'componentIds' object.
    If missing (legacy flat schema), derive it from flat keys.
    Does NOT remove flat keys (harmless); you can strip them later if desired.
    """
    if not isinstance(build, dict):
        return build

    # If already nested and a dict, keep it
    if isinstance(build.get("componentIds"), dict):
        return build

    # Accept legacy alternatives for FC
    fc_id = build.get("flightControllerId") or build.get("fcId")

    build = dict(build)  # shallow copy to avoid side effects
    build["componentIds"] = {
        "frameId": build.get("frameId"),
        "motorId": build.get("motorId"),
        "propellerId": build.get("propellerId"),
        "escId": build.get("escId"),
        "flightControllerId": fc_id,
        "batteryId": build.get("batteryId"),
        "receiverId": build.get("receiverId"),
    }
    return build


# ---------------------------
# Component access
# ---------------------------

def load_all_components() -> Dict:
    """Load all components from single JSON file"""
    if not COMPONENTS_FILE.exists():
        return {
            "motors": [],
            "propellers": [],
            "escs": [],
            "flight_controllers": [],
            "frames": [],
            "batteries": [],
            "receivers": []
        }
    with open(COMPONENTS_FILE, 'r') as f:
        return json.load(f)

def get_all_motors() -> List[Motor]:
    data = load_all_components()
    return [Motor(**item) for item in data.get("motors", [])]

def get_all_propellers() -> List[Propeller]:
    data = load_all_components()
    return [Propeller(**item) for item in data.get("propellers", [])]

def get_all_escs() -> List[ESC]:
    data = load_all_components()
    return [ESC(**item) for item in data.get("escs", [])]

def get_all_flight_controllers() -> List[FlightController]:
    data = load_all_components()
    return [FlightController(**item) for item in data.get("flight_controllers", [])]

def get_all_frames() -> List[Frame]:
    data = load_all_components()
    return [Frame(**item) for item in data.get("frames", [])]

def get_all_batteries() -> List[Battery]:
    data = load_all_components()
    return [Battery(**item) for item in data.get("batteries", [])]

def get_all_receivers() -> List[Receiver]:
    data = load_all_components()
    return [Receiver(**item) for item in data.get("receivers", [])]

def get_all_components_db() -> ComponentDatabase:
    """Get all components in a structured format"""
    return ComponentDatabase(
        motors=get_all_motors(),
        propellers=get_all_propellers(),
        escs=get_all_escs(),
        flight_controllers=get_all_flight_controllers(),
        frames=get_all_frames(),
        batteries=get_all_batteries(),
        receivers=get_all_receivers()
    )

def get_component_by_id(component_type: str, component_id: str):
    """Get a specific component by type and ID"""
    component_getters = {
        "motor": get_all_motors,
        "propeller": get_all_propellers,
        "esc": get_all_escs,
        "flight_controller": get_all_flight_controllers,
        "frame": get_all_frames,
        "battery": get_all_batteries,
        "receiver": get_all_receivers
    }
    getter = component_getters.get(component_type)
    if not getter:
        return None
    for component in getter():
        if component.id == component_id:
            return component
    return None


def get_all_saved_builds() -> List[DroneBuildConfig]:
    """
    Get all saved build configurations.
    Normalizes legacy rows to include a nested 'componentIds' object.
    """
    builds_data = _load_json(get_data_files()[0], default=[])
    normalized = [_ensure_component_ids(b) for b in builds_data]
    return [DroneBuildConfig(**b) for b in normalized]

def hydrate_build(build_config: DroneBuildConfig) -> Optional[DroneBuild]:
    """
    Convert a build configuration (with component IDs) into a full build
    (with complete component objects) for analysis
    """
    components = DroneComponents()

    # Frame
    if build_config.component_ids.frame_id:
        components.frame = get_component_by_id("frame", build_config.component_ids.frame_id)

    # Motor (NOTE: if DroneComponents.motors expects a list, wrap it)
    if build_config.component_ids.motor_id:
        motor = get_component_by_id("motor", build_config.component_ids.motor_id)
        components.motors = motor  # or [motor] if your model expects a list

    # Propeller
    if build_config.component_ids.propeller_id:
        prop = get_component_by_id("propeller", build_config.component_ids.propeller_id)
        components.propellers = prop  # or [prop]

    # ESC
    if build_config.component_ids.esc_id:
        components.esc = get_component_by_id("esc", build_config.component_ids.esc_id)

    # Flight controller
    if build_config.component_ids.flight_controller_id:
        components.flight_controller = get_component_by_id("flight_controller", build_config.component_ids.flight_controller_id)

    # Battery
    if build_config.component_ids.battery_id:
        components.battery = get_component_by_id("battery", build_config.component_ids.battery_id)

    # Receiver
    if build_config.component_ids.receiver_id:
        components.receiver = get_component_by_id("receiver", build_config.component_ids.receiver_id)

    return DroneBuild(
        id=build_config.id or f"build-{uuid.uuid4().hex[:12]}",
        name=build_config.name,
        description=build_config.description,
        components=components,
        created_at=build_config.created_at or datetime.now(timezone.utc),
        updated_at=build_config.updated_at or datetime.now(timezone.utc),
    )

def save_build(build_config: DroneBuildConfig) -> DroneBuildConfig:
    """
    Save a build configuration to file.
    Always writes the nested 'componentIds' shape (aliases) so future reads parse cleanly.
    """
    builds_file, _ = get_data_files()
    builds = _load_json(builds_file, default=[])

    now = datetime.now(timezone.utc)
    build_id = build_config.id or f"bld_{uuid.uuid4().hex[:10]}"
    existing = next((b for b in builds if b.get("id") == build_id), None)

    created_at = build_config.created_at
    if created_at is None and existing and existing.get("createdAt"):
        created_at = datetime.fromisoformat(existing["createdAt"])
    if created_at is None:
        created_at = now

    updated_at = build_config.updated_at or now

    normalized_model = build_config.model_copy(
        update={
            "id": build_id,
            "created_at": created_at,
            "updated_at": updated_at,
        }
    )

    # Convert to dict using field aliases (camelCase), then ensure nested componentIds
    build_dict = normalized_model.model_dump(by_alias=True, exclude_none=True)

    # Ensure timestamps are ISO strings
    if hasattr(created_at, "isoformat"):
        build_dict["createdAt"] = created_at.isoformat()
    if hasattr(updated_at, "isoformat"):
        build_dict["updatedAt"] = updated_at.isoformat()

    # Normalize nested componentIds (in case model was constructed from legacy data)
    build_dict = _ensure_component_ids(build_dict)

    # Update or append
    existing_index = next((i for i, b in enumerate(builds) if b.get("id") == build_id), None)
    if existing_index is not None:
        builds[existing_index] = build_dict
    else:
        builds.append(build_dict)

    _save_json(builds_file, builds)
    return DroneBuildConfig(**build_dict)

def delete_build(build_id: str) -> bool:
    """Delete a build configuration"""
    builds_file, _ = get_data_files()
    if not builds_file.exists():
        return False
    builds = _load_json(builds_file, default=[])
    new_builds = [b for b in builds if b.get("id") != build_id]
    if len(new_builds) == len(builds):
        return False  # not found
    _save_json(builds_file, new_builds)
    return True
