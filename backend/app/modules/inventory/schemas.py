# app/modules/inventory/schemas.py
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date, datetime

class StockBalanceResponse(BaseModel):
    inventory_id: UUID
    rm_id: UUID
    store_id: UUID
    current_qty: float
    reserved_qty: Optional[float] = None
    in_transit_qty: Optional[float] = None
    last_updated: Optional[datetime] = None

    # Enriched fields from joins
    rm_name: Optional[str] = None
    rm_part_no: Optional[str] = None
    store_name: Optional[str] = None
    uom: Optional[str] = None
    min_stock: Optional[float] = None

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
