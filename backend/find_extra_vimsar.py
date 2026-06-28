import asyncio
import pandas as pd
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.rm_models import VendorMaster, RmVendorMapping, RmMaster

async def main():
    # 1. Get parts from Excel
    df = pd.read_excel('Stock report (APR-26) 30.04.26.xlsx', sheet_name='MASTER', header=2)
    df.columns = df.columns.str.strip().str.upper()
    supplier_col = next((c for c in df.columns if 'SUPPLIER' in c or 'VENDOR' in c), None)
    part_col = next((c for c in df.columns if 'PART' in c), None)
    
    df[supplier_col] = df[supplier_col].fillna('')
    df[part_col] = df[part_col].fillna('')
    
    vimsar_df = df[df[supplier_col].str.strip() == 'VIMSAR PRODUCT']
    excel_parts = set([str(p).strip() for p in vimsar_df[part_col].unique() if str(p).strip()])
    
    print(f"Found {len(excel_parts)} unique parts in Excel for VIMSAR PRODUCT.")
    
    # 2. Get parts from DB
    async with AsyncSessionLocal() as db:
        v_res = await db.execute(select(VendorMaster).where(VendorMaster.name == 'VIMSAR PRODUCT'))
        vendor = v_res.scalars().first()
        
        m_res = await db.execute(select(RmVendorMapping).where(RmVendorMapping.vendor_id == vendor.vendor_id))
        mappings = m_res.scalars().all()
        
        r_res = await db.execute(select(RmMaster).where(RmMaster.rm_id.in_([x.rm_id for x in mappings])))
        db_rms = r_res.scalars().all()
        
        print(f"Found {len(db_rms)} mapped materials in DB for VIMSAR PRODUCT.")
        
        # 3. Find extras
        print("\n--- EXTRA MATERIALS IN DB (Not in Excel) ---")
        extra_count = 0
        for rm in db_rms:
            # If the part is not in excel_parts, it's an extra
            # Also check if part_no is None
            part_no = str(rm.part_no).strip() if rm.part_no else ""
            if part_no not in excel_parts:
                print(f"- Name: {rm.name}")
                print(f"  Part No: {rm.part_no}")
                print(f"  Unit: {rm.unit_of_measurement}")
                extra_count += 1
                
        if extra_count == 0:
            print("No extras found based on part_no! (Maybe duplicates mapped to different names?)")

if __name__ == "__main__":
    asyncio.run(main())
