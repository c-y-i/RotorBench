"""
Manual data migration entrypoint.

Copies legacy mutable data files from rotorbench/src/data into backend/data
when backend targets do not yet exist. Also creates timestamped backups of
legacy files before copying.
"""
from __future__ import annotations

import json

from utils.data_migration import migrate_legacy_data_if_needed


if __name__ == "__main__":
    result = migrate_legacy_data_if_needed()
    print(json.dumps(result, indent=2))
