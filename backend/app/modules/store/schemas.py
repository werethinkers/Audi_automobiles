# app/modules/store/schemas.py
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class StoreCreate(BaseModel):
    store_code: str = Field(..., min_length=1, max_length=50)
    store_name: str = Field(..., min_length=1, max_length=200)
    store_type: str = Field(..., min_length=1, max_length=25)
    store_location: Optional[str] = None
    manager_id: Optional[UUID] = None
    allows_direct_issue: Optional[bool] = False
    is_active: Optional[bool] = True

class StoreUpdate(BaseModel):
    store_code: Optional[str] = None
    store_name: Optional[str] = None
    store_type: Optional[str] = None
    store_location: Optional[str] = None
    manager_id: Optional[UUID] = None
    allows_direct_issue: Optional[bool] = None
    is_active: Optional[bool] = None

class StoreResponse(BaseModel):
    store_id: UUID
    store_code: str
    store_name: str
    store_type: str
    store_location: Optional[str]
    manager_id: Optional[UUID]
    allows_direct_issue: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
