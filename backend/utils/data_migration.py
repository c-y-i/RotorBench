"""
One-time migration helper for moving mutable JSON data from frontend paths
to backend runtime data storage.
"""
from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

from utils.data_paths import LEGACY_FRONTEND_DATA_DIR, get_data_files


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _backup_legacy_file(source_file: Path) -> Path:
    backup_path = source_file.with_suffix(f"{source_file.suffix}.bak.{_timestamp()}")
    shutil.copy2(source_file, backup_path)
    return backup_path


def migrate_legacy_data_if_needed() -> Dict[str, str]:
    """
    Copy legacy frontend JSON files to backend data storage on first run.
    If target exists, no migration is performed for that file.
    """
    builds_target, users_target = get_data_files()
    builds_target.parent.mkdir(parents=True, exist_ok=True)

    operations: Dict[str, str] = {}
    mapping = {
        LEGACY_FRONTEND_DATA_DIR / "builds.json": builds_target,
        LEGACY_FRONTEND_DATA_DIR / "users.json": users_target,
    }

    for source, target in mapping.items():
        key = source.name

        if target.exists():
            operations[key] = "skipped_target_exists"
            continue

        if not source.exists():
            operations[key] = "skipped_source_missing"
            continue

        backup_path = _backup_legacy_file(source)
        shutil.copy2(source, target)
        operations[key] = f"migrated_with_backup:{backup_path.name}"

    return operations
