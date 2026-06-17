# app/modules/rm_master/schemas.py
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
 
class RmMasterCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    part_no: Optional[str] = None
    unit_of_measurement: str
    description: Optional[str] = None
    material_type_id: Optional[UUID] = None
    procurement_source_id: Optional[UUID] = None
    minimum_stock: Optional[float] = None
    lead_time_days: Optional[int] = None
    is_active: Optional[bool] = True
 
class RmMasterUpdate(BaseModel):
    name: Optional[str] = None
    part_no: Optional[str] = None
    unit_of_measurement: Optional[str] = None
    description: Optional[str] = None
    material_type_id: Optional[UUID] = None
    procurement_source_id: Optional[UUID] = None
    minimum_stock: Optional[float] = None
    lead_time_days: Optional[int] = None
    is_active: Optional[bool] = None
 
class RmMasterResponse(BaseModel):
    rm_id: UUID
    name: str
    part_no: Optional[str]
    unit_of_measurement: str
    description: Optional[str]
    material_type_id: Optional[UUID]
    procurement_source_id: Optional[UUID]
    minimum_stock: Optional[float]
    lead_time_days: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime
 
    class Config:
        from_attributes = True
