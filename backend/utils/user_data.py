import json
from typing import List, Optional

from utils.data_paths import get_data_files

from models.user import UserProfile

def _load_users_raw() -> list:
    _, users_file = get_data_files()
    if not users_file.exists():
        return []
    with open(users_file, "r", encoding="utf-8") as f:
        return json.load(f)

def list_users() -> List[UserProfile]:
    return [UserProfile(**u) for u in _load_users_raw()]

def get_user(user_id: str) -> Optional[UserProfile]:
    for u in _load_users_raw():
        if u.get("id") == user_id:
            return UserProfile(**u)
    return None

def save_user(profile: UserProfile) -> bool:
    _, users_file = get_data_files()
    users = _load_users_raw()
    as_dict = profile.model_dump(by_alias=True)
    # ensure datetimes are strings
    as_dict["createdAt"] = profile.created_at.isoformat()
    as_dict["updatedAt"] = profile.updated_at.isoformat()

    # upsert
    for i, u in enumerate(users):
        if u.get("id") == profile.id:
            users[i] = as_dict
            break
    else:
        users.append(as_dict)

    users_file.parent.mkdir(parents=True, exist_ok=True)
    with open(users_file, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)
    return True

def delete_user(user_id: str) -> bool:
    _, users_file = get_data_files()
    users = _load_users_raw()
    new_users = [u for u in users if u.get("id") != user_id]
    if len(new_users) == len(users):
        return False
    with open(users_file, "w", encoding="utf-8") as f:
        json.dump(new_users, f, indent=2)
    return True
