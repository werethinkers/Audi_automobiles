# app/modules/procurement/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import date, datetime

# ── PO DETAIL SCHEMAS ────────────────────────────────
class RmPoDetailCreate(BaseModel):
    rm_id: UUID
    ordered_quantity: float
    unit_price: float
    price_per_kg: Optional[float] = None
    price_basis: str = "PER_UNIT"
    calculated_weight: Optional[float] = None
    hsn_code: Optional[str] = None
    gst_rate_pct: float = 18.0
    line_cgst: Optional[float] = 0.0
    line_sgst: Optional[float] = 0.0
    line_igst: Optional[float] = 0.0
    custom_fields: Dict[str, Any] = {}

class RmPoDetailResponse(RmPoDetailCreate):
    po_detail_id: UUID
    po_id: UUID
    received_quantity: float
    line_total_amount: Optional[float]
    line_total_with_tax: Optional[float]
    status: str

    class Config:
        from_attributes = True

# ── PO SCHEMAS ───────────────────────────────────────
class RmPurchaseOrderCreate(BaseModel):
    po_number: str
    vendor_id: UUID
    order_date: date
    expected_date: Optional[date] = None
    status: str = "DRAFT"
    po_type: str = "STANDARD"
    total_weight_kg: Optional[float] = None
    freight_amount: Optional[float] = 0.0
    payment_terms_days: Optional[int] = 30
    remarks: Optional[str] = None
    custom_fields: Dict[str, Any] = {}
    details: List[RmPoDetailCreate] = []

class RmPurchaseOrderResponse(BaseModel):
    po_id: UUID
    po_number: str
    vendor_id: UUID
    order_date: date
    expected_date: Optional[date]
    status: str
    po_type: str
    total_weight_kg: Optional[float]
    total_amount: Optional[float]
    total_with_tax: Optional[float]
    freight_amount: Optional[float]
    payment_terms_days: Optional[int]
    remarks: Optional[str]
    cancel_reason: Optional[str]
    created_at: datetime
    updated_at: datetime
    created_by: UUID
    approved_by: Optional[UUID]
    cancelled_by: Optional[UUID]
    approved_at: Optional[datetime]
    custom_fields: Dict[str, Any]
    details: List[RmPoDetailResponse] = []

    class Config:
        from_attributes = True

class RmPurchaseOrderStatusUpdate(BaseModel):
    status: str

# ── GRN DETAIL SCHEMAS ───────────────────────────────
class GrnDetailCreate(BaseModel):
    po_detail_id: Optional[UUID] = None
    rm_id: UUID
    batch_code: str
    qty_received: float
    qty_accepted: Optional[float] = None
    qty_rejected: Optional[float] = 0.0
    rejection_reason: Optional[str] = None
    weight_received_kg: Optional[float] = None
    uom: str = "NOS"
    batch_status: str = "PENDING_QC"
    destination_store_id: Optional[UUID] = None
    assigned_operator_id: Optional[UUID] = None
    bin_location: Optional[str] = None
    location_type: str = "MAIN"
    fifo_rank: Optional[int] = None
    custom_fields: Dict[str, Any] = {}

class GrnDetailResponse(BaseModel):
    batch_id: UUID
    grn_id: UUID
    po_detail_id: Optional[UUID]
    batch_code: str
    rm_id: UUID
    qty_received: float
    qty_accepted: float
    qty_rejected: float
    rejection_reason: Optional[str]
    weight_received_kg: Optional[float]
    uom: str
    batch_status: str
    destination_store_id: Optional[UUID]
    assigned_operator_id: Optional[UUID]
    bin_location: Optional[str]
    location_type: str
    fifo_rank: Optional[int]
    received_at: datetime
    custom_fields: Dict[str, Any]

    class Config:
        from_attributes = True

# ── GRN SCHEMAS ──────────────────────────────────────
class RmReceivingLogCreate(BaseModel):
    grn_number: str
    po_id: UUID
    vendor_id: UUID
    received_date: date
    vehicle_number: Optional[str] = None
    grn_status: str = "PENDING_QC"
    notes: Optional[str] = None
    gate_entry_id: Optional[UUID] = None
    gate_log_id: Optional[UUID] = None
    details: List[GrnDetailCreate] = []

class RmReceivingLogResponse(BaseModel):
    grn_id: UUID
    grn_number: str
    gate_entry_id: Optional[UUID]
    gate_log_id: Optional[UUID]
    po_id: UUID
    vendor_id: UUID
    received_by: UUID
    received_date: date
    vehicle_number: Optional[str]
    grn_status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    details: List[GrnDetailResponse] = []

    class Config:
        from_attributes = True
