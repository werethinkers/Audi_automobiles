# app/modules/inventory/routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rm_models import RmInventory, RmInventoryLog, RmMaster, StoreMaster
from .service import InventoryService
from .schemas import (
    StockBalanceResponse, ConsumptionRequest, TransferRequest, InventoryLedgerResponse
)
from uuid import UUID
from typing import List, Optional, cast
from decimal import Decimal

router = APIRouter()

@router.get('/balances', response_model=List[StockBalanceResponse])
async def list_stock_balances(
    rm_id: Optional[UUID] = None,
    store_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Fetch a list of stock balances across all or specific stores.
    Purpose: Drives the Inventory Report page. Returns current stock levels
    for Raw Materials, enriched with master data (Name, Part No, UOM).
    """
    # Joined query: inventory + rm_master + store_master
    stmt = (
        select(RmInventory, RmMaster, StoreMaster)
        .join(RmMaster, RmInventory.rm_id == RmMaster.rm_id)
        .join(StoreMaster, RmInventory.store_id == StoreMaster.store_id)
    )
    if rm_id:
        stmt = stmt.where(RmInventory.rm_id == rm_id)
    if store_id:
        stmt = stmt.where(RmInventory.store_id == store_id)

    result = await db.execute(stmt)
    rows = result.all()

    out = []
    for inv, rm, store in rows:
        out.append(StockBalanceResponse(
            inventory_id=inv.inventory_id,
            rm_id=inv.rm_id,
            store_id=inv.store_id,
            current_qty=float(cast(Decimal, inv.current_qty)),
            reserved_qty=float(cast(Decimal, inv.reserved_qty)) if inv.reserved_qty is not None else 0.0,
            in_transit_qty=float(cast(Decimal, inv.in_transit_qty)) if inv.in_transit_qty is not None else 0.0,
            last_updated=inv.last_updated,
            # Enriched fields
            rm_name=rm.name,
            rm_part_no=rm.part_no,
            store_name=store.store_name,
            uom=rm.unit_of_measurement,
            min_stock=float(cast(Decimal, rm.minimum_stock)) if rm.minimum_stock is not None else None,
        ))
    return out
 
@router.get('/balances/{rm_id}/{store_id}', response_model=float)
async def get_stock_balance(
    rm_id: UUID,
    store_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Get the exact current balance for a specific Raw Material in a specific Store.
    Purpose: Used by frontend validation logic before performing consumptions
    or transfers to ensure sufficient stock exists.
    """
    service = InventoryService(db)
    balance = await service.get_balance(rm_id, store_id)
    return float(balance)
 
@router.post('/consume', response_model=float)
async def consume_stock(
    req: ConsumptionRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Consume (reduce) stock from a specific store.
    Purpose: Logs material usage in production. This updates the live stock
    balance and generates a transaction log in the Stock Ledger.
    """
    service = InventoryService(db)
    try:
        new_balance = await service.consume(
            rm_id=req.rm_id,
            store_id=req.store_id,
            qty=Decimal(str(req.qty)),
            consumed_date=req.consumed_date,
            description=req.description,
            remarks=req.remarks
        )
        return float(new_balance)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
 
@router.post('/transfer', response_model=bool)
async def transfer_stock(
    req: TransferRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Transfer stock from one store to another.
    Purpose: Moves physical inventory between locations (e.g., Main Store to Floor Store).
    Generates two ledger entries: a deduction from source, and an addition to destination.
    """
    service = InventoryService(db)
    try:
        await service.transfer(
            rm_id=req.rm_id,
            from_store_id=req.from_store_id,
            to_store_id=req.to_store_id,
            qty=Decimal(str(req.qty)),
            remarks=req.remarks
        )
        return True
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
 
@router.get('/ledger', response_model=List[InventoryLedgerResponse])
async def list_ledger(
    rm_id: Optional[UUID] = None,
    store_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Fetch the stock transaction ledger (history).
    Purpose: Drives the Consumption Report / Stock Ledger page. Provides a full
    audit trail of all GRNs, Consumptions, and Transfers that affected stock levels.
    """
    stmt = (
        select(RmInventoryLog, RmMaster, StoreMaster)
        .join(RmMaster, RmInventoryLog.rm_id == RmMaster.rm_id)
        .join(StoreMaster, RmInventoryLog.store_id == StoreMaster.store_id)
    )
    if rm_id:
        stmt = stmt.where(RmInventoryLog.rm_id == rm_id)
    if store_id:
        stmt = stmt.where(RmInventoryLog.store_id == store_id)
    stmt = stmt.order_by(RmInventoryLog.created_at.desc())
    result = await db.execute(stmt)
    
    out = []
    for log, rm, store in result.all():
        out.append(InventoryLedgerResponse(
            log_id=log.log_id,
            rm_id=log.rm_id,
            store_id=log.store_id,
            transaction_type=log.transaction_type,
            qty=float(cast(Decimal, log.qty)),
            balance_before=float(cast(Decimal, log.balance_before)),
            balance_after=float(cast(Decimal, log.balance_after)),
            reference_type=log.reference_type,
            reference_id=log.reference_id,
            remarks=log.remarks,
            created_at=log.created_at,
            # Enriched fields
            rm_name=rm.name,
            rm_part_no=rm.part_no,
            store_name=store.store_name,
            uom=rm.unit_of_measurement,
            description=log.reference_type,
        ))
    return out
