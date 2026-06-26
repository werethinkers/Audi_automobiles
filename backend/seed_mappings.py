import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from dotenv import load_dotenv

load_dotenv()
from app.models.rm_models import RmMaster, VendorMaster, RmVendorMapping

async def main():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    SessionLocal = sessionmaker(engine, class_=AsyncSession)
    async with SessionLocal() as db:
        # Get all vendors
        vendors_res = await db.execute(select(VendorMaster))
        vendors = list(vendors_res.scalars().all())
        
        # Get all RMs
        rms_res = await db.execute(select(RmMaster))
        rms = list(rms_res.scalars().all())
        
        if not vendors or not rms:
            print("No vendors or RMs found!")
            return
            
        print(f"Found {len(vendors)} vendors and {len(rms)} RMs. Seeding mappings...")
        
        import random
        for vendor in vendors:
            # assign 2 random RMs to each vendor
            assigned_rms = random.sample(rms, min(2, len(rms)))
            for rm in assigned_rms:
                # check if mapping exists
                existing = await db.execute(select(RmVendorMapping).where(RmVendorMapping.vendor_id == vendor.vendor_id, RmVendorMapping.rm_id == rm.rm_id))
                if not existing.scalar_one_or_none():
                    mapping = RmVendorMapping(vendor_id=vendor.vendor_id, rm_id=rm.rm_id, is_active=True)
                    db.add(mapping)
                    
        await db.commit()
        print("Mappings seeded successfully!")

asyncio.run(main())
