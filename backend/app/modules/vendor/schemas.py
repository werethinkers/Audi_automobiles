# app/modules/vendor/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

class VendorCreate(BaseModel):
    vendor_code: str = Field(..., min_length=1, max_length=30)
    vendor_name: str = Field(..., min_length=1, max_length=255)
    contact_person: Optional[str] = None
    contact_mobile: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    gst_number: Optional[str] = None
    vendor_type: str = "SUPPLIER"
    payment_terms: int = 30
    payment_mode: str = "BANK_TRANSFER"
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_name: Optional[str] = None
    approved_item_codes: List[str] = []
    portal_enabled: bool = False
    portal_username: Optional[str] = None
    is_active: bool = True
    custom_fields: Dict[str, Any] = {}

class VendorUpdate(BaseModel):
    vendor_code: Optional[str] = None
    vendor_name: Optional[str] = None
    contact_person: Optional[str] = None
    contact_mobile: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    gst_number: Optional[str] = None
    vendor_type: Optional[str] = None
    payment_terms: Optional[int] = None
    payment_mode: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_name: Optional[str] = None
    approved_item_codes: Optional[List[str]] = None
    portal_enabled: Optional[bool] = None
    portal_username: Optional[str] = None
    is_active: Optional[bool] = None
    custom_fields: Optional[Dict[str, Any]] = None

class VendorResponse(BaseModel):
    vendor_id: UUID
    vendor_code: str
    vendor_name: str
    contact_person: Optional[str]
    contact_mobile: Optional[str]
    contact_email: Optional[str]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    gst_number: Optional[str]
    vendor_type: str
    payment_terms: int
    payment_mode: str
    bank_account_number: Optional[str]
    bank_ifsc: Optional[str]
    bank_name: Optional[str]
    approved_item_codes: List[str]
    portal_enabled: bool
    portal_username: Optional[str]
    is_active: bool
    custom_fields: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
