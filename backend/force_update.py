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
        po_res = await db.execute(select(RmPurchaseOrder).limit(1))
        po = po_res.scalar_one_or_none()
        if po:
            status_res = await db.execute(select(PoStatusMaster).where(PoStatusMaster.code == 'ASN_SHIPPED'))
            new_status = status_res.scalar_one_or_none()
            if new_status:
                print(f"Old status: {po.status_id}")
                po.status_id = new_status.id
                db.add(po)
                await db.commit()
                print("Status updated successfully")
            else:
                print("Status not found")
        else:
            print("PO not found")

if __name__ == "__main__":
    asyncio.run(run())
