"""
Centralized runtime data paths for mutable backend JSON storage.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Tuple

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
LEGACY_FRONTEND_DATA_DIR = PROJECT_ROOT / "rotorbench" / "src" / "data"


def _default_data_dir() -> Path:
    return BACKEND_DIR / "data"


def get_data_dir() -> Path:
    configured = os.getenv("DATA_DIR", "").strip()
    if configured:
        return Path(configured).expanduser().resolve()
    return _default_data_dir()


def get_data_files() -> Tuple[Path, Path]:
    data_dir = get_data_dir()
    return data_dir / "builds.json", data_dir / "users.json"


def ensure_runtime_data_files() -> Tuple[Path, Path]:
    """
    Ensure runtime data directory and core JSON files exist.
    """
    builds_file, users_file = get_data_files()
    builds_file.parent.mkdir(parents=True, exist_ok=True)

    if not builds_file.exists():
        with open(builds_file, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)

    if not users_file.exists():
        with open(users_file, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)

    return builds_file, users_file
