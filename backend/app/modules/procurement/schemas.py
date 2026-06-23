# app/modules/procurement/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
 
# ── PO DETAIL SCHEMAS ────────────────────────────────
class RmPoDetailCreate(BaseModel):
    """
    Payload schema for a single line item within a new Purchase Order.
    Includes the requested quantity, unit price, and applicable GST.
    """
    rm_id: UUID
    order_qty: float
    unit_price: float
    gst_percent: Optional[float] = 0.0
 
class RmPoDetailResponse(BaseModel):
    """
    Schema for serializing a PO line item in the API response.
    Includes calculated fields like `line_amount` and the fulfillment `line_status`.
    """
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
    """
    Payload schema for creating a new Purchase Order (Header).
    Contains a nested list of `details` representing the line items.
    """
    po_number: str
    vendor_id: UUID
    order_date: date
    expected_delivery_date: Optional[date] = None
    status_id: Optional[UUID] = None
    notes: Optional[str] = None
    details: List[RmPoDetailCreate] = []
 
class RmPurchaseOrderResponse(BaseModel):
    """
    Schema for serializing a complete Purchase Order.
    Includes the aggregated `total_amount` and the nested list of line item `details`.
    """
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
    """
    Payload schema for updating the lifecycle status of a PO 
    (e.g., from DRAFT to APPROVED).
    """
    status_id: UUID
 
# ── GRN DETAIL SCHEMAS ───────────────────────────────
class GrnDetailCreate(BaseModel):
    """
    Payload schema for a single line item within a new Goods Receipt Note (GRN).
    Captures how much was received, accepted, and rejected (with reasons).
    """
    po_detail_id: UUID
    rm_id: UUID
    received_qty: float
    accepted_qty: Optional[float] = None
    rejected_qty: Optional[float] = 0.0
    rejection_reason: Optional[str] = None
    store_id: UUID
 
class GrnDetailResponse(BaseModel):
    """
    Schema for serializing a GRN line item in the API response.
    """
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
    """
    Payload schema for logging a new Goods Receipt Note (GRN Header).
    Links the delivery back to the original `po_id` and contains nested `details`.
    """
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
    """
    Schema for serializing a complete Goods Receipt Note (GRN).
    Includes nested line item details.
    """
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
