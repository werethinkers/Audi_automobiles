# app/modules/inventory/schemas.py
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date, datetime

class StockBalanceResponse(BaseModel):
    """
    Schema for serializing a single row in the Stock Balance report.
    Includes both raw database values and enriched human-readable names.
    """
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
    """
    Payload schema for reporting raw material consumption.
    Enforces that consumed quantity must be strictly positive (gt=0).
    """
    rm_id: UUID
    store_id: UUID
    qty: float = Field(..., gt=0)
    consumed_date: date
    description: Optional[str] = None
    remarks: Optional[str] = None
 
class TransferRequest(BaseModel):
    """
    Payload schema for requesting an internal store-to-store transfer.
    Enforces positive quantity to prevent reverse transfers via negative numbers.
    """
    rm_id: UUID
    from_store_id: UUID
    to_store_id: UUID
    qty: float = Field(..., gt=0)
    remarks: Optional[str] = None
 
class InventoryLedgerResponse(BaseModel):
    """
    Schema for serializing historical stock transactions (The Ledger).
    Captures the exact balance before and after the transaction for auditing.
    """
    log_id: UUID
    rm_id: UUID
    store_id: UUID
    transaction_type: str
    qty: float
    balance_before: float
    balance_after: float
    reference_type: Optional[str]
    reference_id: Optional[UUID]
    remarks: Optional[str]
    created_at: datetime

    # Enriched fields from joins
    rm_name: Optional[str] = None
    rm_part_no: Optional[str] = None
    store_name: Optional[str] = None
    uom: Optional[str] = None
    description: Optional[str] = None
 
    class Config:
        from_attributes = True
