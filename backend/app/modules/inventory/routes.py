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
from typing import List, Optional
from decimal import Decimal

router = APIRouter()

@router.get('/balances', response_model=List[StockBalanceResponse])
async def list_stock_balances(
    rm_id: Optional[UUID] = None,
    store_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
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
            current_qty=float(inv.current_qty),
            reserved_qty=float(inv.reserved_qty) if inv.reserved_qty is not None else 0.0,
            in_transit_qty=float(inv.in_transit_qty) if inv.in_transit_qty is not None else 0.0,
            last_updated=inv.last_updated,
            # Enriched fields
            rm_name=rm.name,
            rm_part_no=rm.part_no,
            store_name=store.store_name,
            uom=rm.unit_of_measurement,
            min_stock=float(rm.minimum_stock) if rm.minimum_stock is not None else None,
        ))
    return out
 
@router.get('/balances/{rm_id}/{store_id}', response_model=float)
async def get_stock_balance(
    rm_id: UUID,
    store_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    service = InventoryService(db)
    balance = await service.get_balance(rm_id, store_id)
    return float(balance)
 
@router.post('/consume', response_model=float)
async def consume_stock(
    req: ConsumptionRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
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
    stmt = select(RmInventoryLog)
    if rm_id:
        stmt = stmt.where(RmInventoryLog.rm_id == rm_id)
    if store_id:
        stmt = stmt.where(RmInventoryLog.store_id == store_id)
    stmt = stmt.order_by(RmInventoryLog.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())
