# app/modules/inventory/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.rm_models import RmInventory, RmInventoryLog, RmConsumptionLog
from decimal import Decimal
from datetime import datetime, date
from typing import cast
import uuid
 
class InventoryService:
    def __init__(self, db: AsyncSession):
        self.db = db
 
    async def get_balance(self, rm_id: uuid.UUID, store_id: uuid.UUID) -> Decimal:
        result = await self.db.execute(
            select(RmInventory).where(
                RmInventory.rm_id == rm_id,
                RmInventory.store_id == store_id
            ).with_for_update()  # <-- ROW LOCK — never remove this
        )
        inv = result.scalar_one_or_none()
        return cast(Decimal, inv.current_qty) if inv else Decimal('0.0')
 
    async def post_transaction(
        self, rm_id: uuid.UUID, store_id: uuid.UUID, qty: Decimal,
        transaction_type: str, reference_type=None,
        reference_id=None, remarks=None
    ) -> Decimal:
        # 1. Get current balance WITH row lock
        result = await self.db.execute(
            select(RmInventory)
            .where(RmInventory.rm_id==rm_id, RmInventory.store_id==store_id)
            .with_for_update()
        )
        inv = result.scalar_one_or_none()
 
        balance_before = cast(Decimal, inv.current_qty) if inv else Decimal('0.0')
        balance_after  = balance_before + qty
 
        # 2. Guard: block negative balance
        if balance_after < 0:
            raise ValueError(
                f'Insufficient stock. Available: {balance_before}, Requested: {abs(qty)}'
            )
 
        # 3. Upsert balance row
        if inv:
            inv.current_qty = balance_after
            inv.last_updated = datetime.utcnow()
        else:
            inv = RmInventory(
                rm_id=rm_id, store_id=store_id,
                current_qty=balance_after,
                last_updated=datetime.utcnow()
            )
            self.db.add(inv)
 
        # 4. Write immutable log entry
        self.db.add(RmInventoryLog(
            rm_id=rm_id, store_id=store_id,
            transaction_type=transaction_type,
            qty=qty,
            balance_before=balance_before,
            balance_after=balance_after,
            reference_type=reference_type,
            reference_id=reference_id,
            remarks=remarks,
            created_at=datetime.utcnow()
        ))
 
        await self.db.flush()
        return balance_after
 
    async def consume(
        self, rm_id, store_id, qty: Decimal,
        consumed_date: date, description=None, remarks=None
    ):
        # Post stock OUT transaction
        new_balance = await self.post_transaction(
            rm_id, store_id, -qty,  # negative = debit
            transaction_type='CONSUMPTION',
            reference_type='MANUAL',
            remarks=remarks
        )
        # Write consumption log
        self.db.add(RmConsumptionLog(
            rm_id=rm_id, store_id=store_id,
            qty_used=qty, consumption_type='MANUAL',
            consumed_date=consumed_date,
            description=description, remarks=remarks,
        ))
        await self.db.flush()
        return new_balance
 
    async def grn_post(
        self, rm_id, store_id, accepted_qty: Decimal, grn_id
    ):
        return await self.post_transaction(
            rm_id, store_id, accepted_qty,  # positive = credit
            transaction_type='GRN_RECEIPT',
            reference_type='GRN', reference_id=grn_id
        )
 
    async def transfer(
        self, rm_id, from_store_id, to_store_id, qty: Decimal, remarks=None
    ):
        # Always lock in consistent order to avoid deadlock
        ids = sorted([str(from_store_id), str(to_store_id)])
        if ids[0] == str(from_store_id):
            await self.post_transaction(rm_id, from_store_id, -qty, 'TRANSFER_OUT', remarks=remarks)
            await self.post_transaction(rm_id, to_store_id, qty, 'TRANSFER_IN', remarks=remarks)
        else:
            await self.post_transaction(rm_id, to_store_id, qty, 'TRANSFER_IN', remarks=remarks)
            await self.post_transaction(rm_id, from_store_id, -qty, 'TRANSFER_OUT', remarks=remarks)
