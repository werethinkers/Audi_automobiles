# app/modules/procurement/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
 
# ── PO DETAIL SCHEMAS ────────────────────────────────
class RmPoDetailCreate(BaseModel):
    rm_id: UUID
    order_qty: float
    unit_price: float
    gst_percent: Optional[float] = 0.0
 
class RmPoDetailResponse(BaseModel):
    po_detail_id: UUID
    po_id: UUID
    rm_id: UUID
    order_qty: float
    received_qty: float
    unit_price: float
    gst_percent: Optional[float]
    line_amount: Optional[float]
    line_status: str
    created_at: datetime
 
    class Config:
        from_attributes = True
 
# ── PO SCHEMAS ───────────────────────────────────────
class RmPurchaseOrderCreate(BaseModel):
    po_number: str
    vendor_id: UUID
    order_date: date
    expected_delivery_date: Optional[date] = None
    status_id: Optional[UUID] = None
    notes: Optional[str] = None
    details: List[RmPoDetailCreate] = []
 
class RmPurchaseOrderResponse(BaseModel):
    po_id: UUID
    po_number: Optional[str]
    vendor_id: Optional[UUID]
    order_date: date
    expected_delivery_date: Optional[date]
    status_id: Optional[UUID]
    total_amount: Optional[float]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    details: List[RmPoDetailResponse] = []
 
    class Config:
        from_attributes = True

class RmPurchaseOrderStatusUpdate(BaseModel):
    status_id: UUID
 
# ── GRN DETAIL SCHEMAS ───────────────────────────────
class GrnDetailCreate(BaseModel):
    po_detail_id: UUID
    rm_id: UUID
    received_qty: float
    accepted_qty: Optional[float] = None
    rejected_qty: Optional[float] = 0.0
    rejection_reason: Optional[str] = None
    store_id: UUID
 
class GrnDetailResponse(BaseModel):
    grn_detail_id: UUID
    grn_id: Optional[UUID]
    po_detail_id: Optional[UUID]
    rm_id: Optional[UUID]
    received_qty: float
    accepted_qty: Optional[float]
    rejected_qty: Optional[float]
    rejection_reason: Optional[str]
    store_id: Optional[UUID]
    created_at: datetime
 
    class Config:
        from_attributes = True
 
# ── GRN SCHEMAS ──────────────────────────────────────
class RmReceivingLogCreate(BaseModel):
    grn_number: str
    po_id: UUID
    vendor_id: UUID
    received_date: date
    vehicle_number: Optional[str] = None
    dc_number: Optional[str] = None
    grn_status: Optional[str] = "PENDING_QA"
    remarks: Optional[str] = None
    details: List[GrnDetailCreate] = []
 
class RmReceivingLogResponse(BaseModel):
    grn_id: UUID
    grn_number: Optional[str]
    po_id: Optional[UUID]
    vendor_id: Optional[UUID]
    received_date: date
    vehicle_number: Optional[str]
    dc_number: Optional[str]
    grn_status: str
    remarks: Optional[str]
    created_at: datetime
    updated_at: datetime
    details: List[GrnDetailResponse] = []
 
    class Config:
        from_attributes = True
