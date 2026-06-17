# app/modules/store/schemas.py
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
 
class StoreCreate(BaseModel):
    store_name: str = Field(..., min_length=1, max_length=150)
    location: Optional[str] = None
    is_active: Optional[bool] = True
 
class StoreUpdate(BaseModel):
    store_name: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None
 
class StoreResponse(BaseModel):
    store_id: UUID
    store_name: str
    location: Optional[str]
    is_active: bool
    created_at: datetime
 
    class Config:
        from_attributes = True
