from pydantic import BaseModel, EmailStr, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime


class Individual(BaseModel):
    id: Optional[str]
    canonical_name: str
    aliases: Optional[List[str]] = []
    primary_email: Optional[EmailStr]
    primary_phone: Optional[str]
    websites: Optional[List[HttpUrl]] = []
    social_handles: Optional[Dict[str, Any]] = {}
    provenance: Optional[Dict[str, Any]] = {}
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


class MetricRecord(BaseModel):
    id: Optional[str]
    individual_id: str
    metric_key: str
    metric_value: Dict[str, Any]
    computed_at: Optional[datetime]
