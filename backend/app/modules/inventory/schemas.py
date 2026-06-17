# app/modules/inventory/schemas.py
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date, datetime

class StockBalanceResponse(BaseModel):
    inventory_id: UUID
    rm_id: UUID
    store_id: UUID
    location_type: str
    bin_location: Optional[str]
    batch_id: Optional[UUID]
    current_stock_pcs: float
    reserved_pcs: float
    wip_pcs: float
    pending_putaway_pcs: float
    in_transit_qty: float
    last_updated: datetime

    class Config:
        from_attributes = True

class ConsumptionRequest(BaseModel):
    rm_id: UUID
    store_id: UUID
    qty_used: float = Field(..., gt=0)
    weight_used_kg: Optional[float] = None
    planned_date: Optional[date] = None
    usage_date: datetime
    description: Optional[str] = None
    remarks: Optional[str] = None

class TransferRequest(BaseModel):
    rm_id: UUID
    from_store_id: UUID
    to_store_id: UUID
    change_quantity_pcs: float = Field(..., gt=0)
    remarks: Optional[str] = None

class InventoryLedgerResponse(BaseModel):
    log_id: UUID
    rm_id: UUID
    store_id: Optional[UUID]
    location_type: str
    batch_id: Optional[UUID]
    transaction_type: str
    change_quantity_pcs: float
    balance_before: float
    new_quantity_after_change: float
    reference_type: Optional[str]
    reference_id: Optional[UUID]
    remarks: Optional[str]
    transaction_date: datetime
    updated_by: UUID

    class Config:
        from_attributes = True
