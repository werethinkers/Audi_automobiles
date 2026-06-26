import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import os
from dotenv import load_dotenv

load_dotenv()

from app.models.vendor_portal import ASNLog
from app.models.rm_models import RmPurchaseOrder

async def run():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    SessionLocal = sessionmaker(engine, class_=AsyncSession)
    async with SessionLocal() as db:
        result = await db.execute(
            select(ASNLog, RmPurchaseOrder.po_number)
            .join(RmPurchaseOrder, ASNLog.po_id == RmPurchaseOrder.po_id)
        )
        rows = result.all()
        print(f"Found {len(rows)} rows.")
        for row in rows:
            print(f"ASN: {row.ASNLog.asn_number}, PO: {row.po_number}")

if __name__ == "__main__":
    asyncio.run(run())
