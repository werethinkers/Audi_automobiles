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
    last_updated: datetime
 
    class Config:
        from_attributes = True
 
class ConsumptionRequest(BaseModel):
    rm_id: UUID
    store_id: UUID
    qty: float = Field(..., gt=0)
    consumed_date: date
    description: Optional[str] = None
    remarks: Optional[str] = None
 
class TransferRequest(BaseModel):
    rm_id: UUID
    from_store_id: UUID
    to_store_id: UUID
    qty: float = Field(..., gt=0)
    remarks: Optional[str] = None
 
class InventoryLedgerResponse(BaseModel):
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
 
    class Config:
        from_attributes = True
