import asyncio
from sqlalchemy import select, delete
from app.core.database import AsyncSessionLocal
from app.models.rm_models import VendorMaster, RmVendorMapping, RmMaster

async def main():
    async with AsyncSessionLocal() as db:
        # Get VIMSAR PRODUCT
        v_res = await db.execute(select(VendorMaster).where(VendorMaster.name == 'VIMSAR PRODUCT'))
        vendor = v_res.scalars().first()
        if not vendor:
            print("VIMSAR PRODUCT not found")
            return
            
        # Get the two RMs
        parts_to_delete = ['AE007339', 'IE331756A']
        rm_res = await db.execute(select(RmMaster).where(RmMaster.part_no.in_(parts_to_delete)))
        rms = rm_res.scalars().all()
        
        if not rms:
            print("RMs not found")
            return
            
        rm_ids = [rm.rm_id for rm in rms]
        
        # Delete mappings
        stmt = delete(RmVendorMapping).where(
            RmVendorMapping.vendor_id == vendor.vendor_id,
            RmVendorMapping.rm_id.in_(rm_ids)
        )
        
        result = await db.execute(stmt)
        await db.commit()
        
        print(f"Successfully deleted {result.rowcount} mappings for VIMSAR PRODUCT.")

if __name__ == "__main__":
    asyncio.run(main())
