# app/modules/vendor/schemas.py
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime
 
class VendorCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    payment_terms: Optional[str] = None
    is_active: Optional[bool] = True
 
class VendorUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    payment_terms: Optional[str] = None
    is_active: Optional[bool] = None
 
class VendorResponse(BaseModel):
    vendor_id: UUID
    name: str
    contact_person: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    gst_number: Optional[str]
    address_line1: Optional[str]
    city: Optional[str]
    state: Optional[str]
    payment_terms: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
 
    class Config:
        from_attributes = True

class VendorRmResponse(BaseModel):
    rm_id: UUID
    name: str
    part_no: Optional[str]
    unit_of_measurement: str
    standard_cost: Optional[float]

    class Config:
        from_attributes = True

class VendorRmAdd(BaseModel):
    rm_id: UUID
    standard_cost: Optional[float] = None
