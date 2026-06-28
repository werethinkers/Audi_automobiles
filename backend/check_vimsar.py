import asyncio
from sqlalchemy import select, func
from app.core.database import AsyncSessionLocal
from app.models.rm_models import VendorMaster, RmVendorMapping, RmMaster

async def main():
    async with AsyncSessionLocal() as db:
        vendor_name = 'VIMSAR PRODUCT'
        v_res = await db.execute(select(VendorMaster).where(VendorMaster.name == vendor_name))
        vendor = v_res.scalars().first()
        if not vendor:
            print(f"Vendor '{vendor_name}' not found!")
            return
            
        print(f"Vendor '{vendor_name}' found. ID: {vendor.vendor_id}, is_active: {vendor.is_active}")
        
        m_res = await db.execute(select(RmVendorMapping).where(RmVendorMapping.vendor_id == vendor.vendor_id))
        mappings = m_res.scalars().all()
        print(f"Total mappings for this vendor: {len(mappings)}")
        
        active_mappings = [m for m in mappings if m.is_active]
        print(f"Active mappings: {len(active_mappings)}")
        
        if mappings:
            for m in mappings[:5]:
                rm_res = await db.execute(select(RmMaster).where(RmMaster.rm_id == m.rm_id))
                rm = rm_res.scalars().first()
                if rm:
                    print(f"  RM: {rm.name}, RM is_active: {rm.is_active}")
                else:
                    print(f"  RM ID {m.rm_id} not found in RmMaster!")

if __name__ == "__main__":
    asyncio.run(main())
