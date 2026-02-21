from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict
from datetime import datetime

class UserProfile(BaseModel):
    id: Optional[str] = None  # Make it optional
    email: EmailStr
    display_name: str = Field(..., alias="displayName")
    github_username: Optional[str] = Field(None, alias="githubUsername")
    avatar_url: Optional[str] = Field(None, alias="avatarUrl")
    preferences: Dict[str, str] = Field(default_factory=dict)
    created_at: Optional[datetime] = Field(None, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")

    class Config:
        populate_by_name = True
