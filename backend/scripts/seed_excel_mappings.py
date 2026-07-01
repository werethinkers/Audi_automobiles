import os
import sys
import uuid
import asyncio
import pandas as pd
from decimal import Decimal
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

# Setup path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal
from app.models.rm_models import RmMaster, VendorMaster, RmVendorMapping

EXCEL_FILE = "Stock report (APR-26) 30.04.26.xlsx"

async def seed_data():
    if not os.path.exists(EXCEL_FILE):
        print(f"Error: {EXCEL_FILE} not found!")
        return

    print("Loading Excel file...")
    try:
        df = pd.read_excel(EXCEL_FILE, sheet_name='MASTER', header=2)
    except Exception as e:
        print(f"Failed to read Excel: {e}")
        return
    
    # Standardize column names
    df.columns = df.columns.str.strip().str.upper()
    
    part_no_col = next((c for c in df.columns if 'PART' in c), None)
    desc_col = next((c for c in df.columns if 'DESC' in c), None)
    supplier_col = next((c for c in df.columns if 'SUPPLIER' in c or 'VENDOR' in c), None)
    price_col = next((c for c in df.columns if 'PRICE' in c or 'COST' in c), None)
    uom_col = next((c for c in df.columns if 'UOM' in c or 'UNIT' in c), None)
    
    print(f"Using columns: PartNo={part_no_col}, Desc={desc_col}, Supplier={supplier_col}, Price={price_col}, UOM={uom_col}")
    
    if not all([part_no_col, desc_col, supplier_col, price_col]):
        print("Could not find all required columns!")
        return

    async with AsyncSessionLocal() as db:
        vendors_created = 0
        materials_created = 0
        mappings_created = 0
        
        vendor_cache = {}
        rm_cache = {}
        for index, row in df.iterrows():
            try:
                part_no = str(row[part_no_col]).strip()
                desc = str(row[desc_col]).strip()
                supplier_name = str(row[supplier_col]).strip()
                
                if not part_no or part_no == 'nan' or not supplier_name or supplier_name == 'nan':
                    continue
                    
                raw_price = row[price_col]
                price = Decimal('0.0')
                if pd.notna(raw_price) and str(raw_price).strip() != '':
                    try:
                        price = Decimal(str(raw_price))
                    except:
                        pass
                
                uom = str(row[uom_col]).strip() if pd.notna(row[uom_col]) else 'NOS'
                if uom == 'nan': uom = 'NOS'
                
                # 1. Get or Create Vendor
                if supplier_name not in vendor_cache:
                    v_res = await db.execute(select(VendorMaster).filter(VendorMaster.name == supplier_name))
                    vendor = v_res.scalars().first()
                    if not vendor:
                        vendor = VendorMaster(
                            vendor_id=uuid.uuid4(),
                            name=supplier_name,
                            is_active=True
                        )
                        db.add(vendor)
                        await db.commit()
                        await db.refresh(vendor)
                        vendors_created += 1
                    vendor_cache[supplier_name] = vendor.vendor_id
                
                v_id = vendor_cache[supplier_name]
                
                # 2. Get or Create RM
                if part_no not in rm_cache:
                    r_res = await db.execute(select(RmMaster).filter(RmMaster.part_no == part_no))
                    rm = r_res.scalars().first()
                    if not rm:
                        rm = RmMaster(
                            rm_id=uuid.uuid4(),
                            part_no=part_no,
                            name=desc,
                            unit_of_measurement=uom,
                            is_active=True
                        )
                        db.add(rm)
                        await db.commit()
                        await db.refresh(rm)
                        materials_created += 1
                    rm_cache[part_no] = rm.rm_id
                
                r_id = rm_cache[part_no]
                
                # 3. Create Mapping
                m_res = await db.execute(select(RmVendorMapping).filter(
                    RmVendorMapping.rm_id == r_id,
                    RmVendorMapping.vendor_id == v_id
                ))
                existing_mapping = m_res.scalars().first()
                
                if not existing_mapping:
                    mapping = RmVendorMapping(
                        mapping_id=uuid.uuid4(),
                        rm_id=r_id,
                        vendor_id=v_id,
                        standard_cost=price,
                        is_active=True
                    )
                    db.add(mapping)
                    mappings_created += 1

            except Exception as e:
                print(f"Error processing row {index}: {e}")
                await db.rollback()
                
        await db.commit()
        
        print("\n--- Seeding Complete ---")
        print(f"Vendors Created: {vendors_created}")
        print(f"Materials Created: {materials_created}")
        print(f"Mappings Created: {mappings_created}")

if __name__ == "__main__":
    asyncio.run(seed_data())
