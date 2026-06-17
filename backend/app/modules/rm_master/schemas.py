# app/modules/rm_master/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, Any, Dict
from uuid import UUID
from datetime import datetime

class RmMasterBase(BaseModel):
    part_number: str = Field(..., min_length=1, max_length=100)
    part_name: str = Field(..., min_length=1, max_length=255)
    part_no_client: Optional[str] = None
    part_type: str = "FINISHED_PART"
    material_type_id: Optional[UUID] = None
    sourcing_type: str = "BOP"
    procurement_source_id: Optional[UUID] = None
    description: Optional[str] = None
    unit_of_measurement: str = "NOS"
    standard_cost: Optional[float] = None
    reorder_level: Optional[float] = None
    weight_per_piece_kg: Optional[float] = None
    minimum_stock: Optional[float] = None
    lead_time_days: Optional[int] = None
    rm_section: Optional[str] = None
    rm_thickness: Optional[float] = None
    rm_section_type: Optional[str] = None
    rm_grade: Optional[str] = None
    standard_length_mm: Optional[float] = None
    cut_length: Optional[float] = None
    design_length: Optional[float] = None
    cal_weight: Optional[float] = None
    hsn_code: Optional[str] = None
    gst_rate_pct: Optional[float] = 18.00
    is_active: bool = True
    custom_fields: Dict[str, Any] = {}
    created_by: Optional[UUID] = None

class RmMasterCreate(RmMasterBase):
    pass

class RmMasterUpdate(BaseModel):
    part_number: Optional[str] = None
    part_name: Optional[str] = None
    part_no_client: Optional[str] = None
    part_type: Optional[str] = None
    material_type_id: Optional[UUID] = None
    sourcing_type: Optional[str] = None
    procurement_source_id: Optional[UUID] = None
    description: Optional[str] = None
    unit_of_measurement: Optional[str] = None
    standard_cost: Optional[float] = None
    reorder_level: Optional[float] = None
    weight_per_piece_kg: Optional[float] = None
    minimum_stock: Optional[float] = None
    lead_time_days: Optional[int] = None
    rm_section: Optional[str] = None
    rm_thickness: Optional[float] = None
    rm_section_type: Optional[str] = None
    rm_grade: Optional[str] = None
    standard_length_mm: Optional[float] = None
    cut_length: Optional[float] = None
    design_length: Optional[float] = None
    cal_weight: Optional[float] = None
    hsn_code: Optional[str] = None
    gst_rate_pct: Optional[float] = None
    is_active: Optional[bool] = None
    custom_fields: Optional[Dict[str, Any]] = None
    created_by: Optional[UUID] = None

class RmMasterResponse(RmMasterBase):
    rm_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
