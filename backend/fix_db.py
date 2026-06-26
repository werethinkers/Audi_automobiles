import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import os
from dotenv import load_dotenv

load_dotenv()

from app.models.rm_models import RmPurchaseOrder, PoStatusMaster

async def run():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    SessionLocal = sessionmaker(engine, class_=AsyncSession)
    async with SessionLocal() as db:
        po_res = await db.execute(select(RmPurchaseOrder).where(RmPurchaseOrder.po_number.in_(['PO-759165'])))
        pos = po_res.scalars().all()
        
        status_res = await db.execute(select(PoStatusMaster).where(PoStatusMaster.code == 'ASN_SHIPPED'))
        new_status = status_res.scalar_one_or_none()
        
        if new_status:
            for po in pos:
                po.status_id = new_status.id
                db.add(po)
            await db.commit()
            print("Status updated successfully")

if __name__ == "__main__":
    asyncio.run(run())
