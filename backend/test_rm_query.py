import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from dotenv import load_dotenv

load_dotenv()
from app.models.rm_models import RmMaster, RmVendorMapping

async def main():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    SessionLocal = sessionmaker(engine, class_=AsyncSession)
    async with SessionLocal() as db:
        vendor_id = "357e1b23-f147-47ee-800b-32d2e427217f"
        stmt = select(RmMaster).join(RmVendorMapping, RmMaster.rm_id == RmVendorMapping.rm_id).where(RmVendorMapping.vendor_id == vendor_id)
        result = await db.execute(stmt)
        rms = result.scalars().all()
        print("MAPPED RMS:", [r.name for r in rms])

asyncio.run(main())
