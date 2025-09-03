from pydantic import BaseModel, EmailStr, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime


class Member(BaseModel):
    id: Optional[str]
    full_name: str
    roles: Optional[List[str]] = []
    affiliation: Optional[str]
    emails: Optional[List[EmailStr]] = []
    phones: Optional[List[str]] = []
    websites: Optional[List[HttpUrl]] = []
    social_handles: Optional[Dict[str, Any]] = {}
    verified: bool = False
    created_at: Optional[datetime]

