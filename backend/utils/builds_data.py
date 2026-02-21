import json, uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

from utils.data_paths import get_data_files

def _read() -> List[Dict[str, Any]]:
    builds_file, _ = get_data_files()
    if not builds_file.exists():
        return []
    with open(builds_file, "r", encoding="utf-8") as f:
        return json.load(f)

def _write(items: List[Dict[str, Any]]) -> None:
    builds_file, _ = get_data_files()
    builds_file.parent.mkdir(parents=True, exist_ok=True)
    with open(builds_file, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)

def list_builds(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    items = _read()
    return [b for b in items if b.get("userId") == user_id] if user_id else items

def get_build(bid: str) -> Optional[Dict[str, Any]]:
    for b in _read():
        if b.get("id") == bid:
            return b
    return None

def create_build(data: Dict[str, Any]) -> Dict[str, Any]:
    items = _read()
    now = datetime.utcnow().isoformat()
    data = {**data}
    data["id"] = data.get("id") or f"bld_{uuid.uuid4().hex[:10]}"
    data["createdAt"] = data.get("createdAt") or now
    data["updatedAt"] = now
    items.append(data)
    _write(items)
    return data

def update_build(bid: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    items = _read()
    for i, b in enumerate(items):
        if b.get("id") == bid:
            merged = {**b, **data}
            merged["id"] = bid
            merged["updatedAt"] = datetime.utcnow().isoformat()
            items[i] = merged
            _write(items)
            return merged
    return None

def delete_build(bid: str) -> bool:
    items = _read()
    new_items = [b for b in items if b.get("id") != bid]
    if len(new_items) == len(items):
        return False
    _write(new_items)
    return True
