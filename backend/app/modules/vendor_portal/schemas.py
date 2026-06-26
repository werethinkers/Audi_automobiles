import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, Any
from pydantic import BaseModel, Field, EmailStr

# ── AUTHENTICATION ─────────────────────────────────────
class VendorLoginRequest(BaseModel):
    portal_username: str = Field(..., description="Mobile number or email assigned to vendor")
    portal_password: str

class VendorLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    vendor_id: uuid.UUID
    vendor_name: str

class VendorAuthPayload(BaseModel):
    sub: str
    sub_type: str
    session_id: str
    exp: int

# ── PURCHASE ORDERS ────────────────────────────────────
class POListResponse(BaseModel):
    po_id: uuid.UUID
    po_number: str
    order_date: date
    expected_delivery_date: Optional[date]
    total_amount: Decimal
    status: str

class PODetailLine(BaseModel):
    po_detail_id: uuid.UUID
    part_no: Optional[str]
    name: str
    unit_of_measurement: str
    order_qty: Decimal
    received_qty: Decimal
    unit_price: Decimal
    gst_percent: Optional[Decimal]
    line_amount: Decimal
    line_status: str

class PODetailResponse(BaseModel):
    po_id: uuid.UUID
    po_number: str
    order_date: date
    expected_delivery_date: Optional[date]
    total_amount: Decimal
    notes: Optional[str]
    status: str
    details: List[PODetailLine]

class POActionRequest(BaseModel):
    notes: Optional[str] = None

# ── ASNs ───────────────────────────────────────────────
class ASNLineRequest(BaseModel):
    po_detail_id: uuid.UUID
    qty_shipped: Decimal
    vendor_batch_ref: Optional[str] = None

class ASNSubmitRequest(BaseModel):
    po_id: uuid.UUID
    expected_date: date
    delivery_mode: str
    courier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    arrival_window: Optional[str] = None
    lines: List[ASNLineRequest]

class ASNDetailLineResponse(BaseModel):
    asn_detail_id: uuid.UUID
    po_detail_id: uuid.UUID
    part_no: Optional[str]
    name: str
    qty_shipped: Decimal
    vendor_batch_ref: Optional[str]

class ASNResponse(BaseModel):
    asn_id: uuid.UUID
    asn_number: str
    po_id: uuid.UUID
    po_number: str
    expected_date: date
    delivery_mode: str
    courier_name: Optional[str]
    tracking_number: Optional[str]
    vehicle_number: Optional[str]
    driver_name: Optional[str]
    arrival_window: Optional[str]
    status: str
    details: List[ASNDetailLineResponse]

class ASNListResponse(BaseModel):
    asn_id: uuid.UUID
    asn_number: str
    po_id: uuid.UUID
    po_number: str
    expected_date: date
    delivery_mode: str
    status: str

# ── REJECTIONS & NCRS ──────────────────────────────────
class RejectionListResponse(BaseModel):
    rejection_id: uuid.UUID
    rln: str
    grn_number: str
    reason_description: str
    total_qty: Decimal
    status: str
    disposition_deadline: Optional[datetime]

class RejectionActionRequest(BaseModel):
    action: str = Field(..., description="'WILL_REPLACE', 'WILL_COLLECT', 'DISPUTE'")
    notes: Optional[str] = None

class CARSubmitRequest(BaseModel):
    root_cause: str
    action_taken: str
    prevention: str

class DisputeRequest(BaseModel):
    entity_type: str = Field(..., description="'REJECTION', 'NCR', 'GRN'")
    entity_id: uuid.UUID
    dispute_type: str
    description: str

# ── SCORECARD ──────────────────────────────────────────
class ScorecardResponse(BaseModel):
    scorecard_id: uuid.UUID
    period_start: date
    period_end: date
    deliveries_total: int
    deliveries_on_time: int
    batches_total: int
    batches_first_pass: int
    rejection_count: int
    ncr_count: int
    avg_lead_time_days: Optional[Decimal]
    on_time_pct: Decimal
    first_pass_pct: Decimal
