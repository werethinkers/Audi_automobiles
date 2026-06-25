import asyncio
import sys
import os
import pandas as pd
import uuid
from decimal import Decimal

# Add backend to sys path so we can import app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import AsyncSessionLocal
from app.models.rm_models import RmMaster, VendorMaster, RmVendorMapping, StoreMaster, RmInventory

file_path = "Stock report (APR-26) 30.04.26.xlsx"
sheet_name = 'Planing & Incoming'

async def ingest_data():
    print("Reading Excel file...")
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
    except Exception as e:
        print(f"Failed to read excel: {e}")
        return

    # Find header row
    header_row_idx = -1
    for idx, row in df.iterrows():
        if any(isinstance(cell, str) and "PART NO" in cell for cell in row.values):
            header_row_idx = idx
            break

    if header_row_idx == -1:
        print("Header row not found.")
        return
        
    df_parts = pd.read_excel(file_path, sheet_name=sheet_name, skiprows=header_row_idx)
    df_parts.columns = df_parts.columns.str.strip()
    df_parts = df_parts.dropna(subset=['PART NO .'])

    async with AsyncSessionLocal() as session:
        # Create a default Store if none exists
        from sqlalchemy.future import select
        store_result = await session.execute(select(StoreMaster).where(StoreMaster.store_name == "Main Warehouse"))
        main_store = store_result.scalars().first()
        if not main_store:
            main_store = StoreMaster(store_name="Main Warehouse", location="Factory Floor")
            session.add(main_store)
            await session.flush()
            print("Created default 'Main Warehouse' store.")

        # Cache vendors to avoid duplicate inserts
        vendor_result = await session.execute(select(VendorMaster))
        vendors = {v.name: v.vendor_id for v in vendor_result.scalars().all()}
        
        # Cache RM to avoid duplicate
        rm_result = await session.execute(select(RmMaster))
        rms = {r.part_no: r for r in rm_result.scalars().all() if r.part_no}

        new_rm_count = 0
        new_vendor_count = 0
        
        print(f"Processing {len(df_parts)} rows...")
        
        for index, row in df_parts.iterrows():
            part_no = str(row['PART NO .']).strip()
            desc = str(row['DESCRIPTION']) if pd.notna(row['DESCRIPTION']) else ""
            supplier_name = str(row['SUPPLIER NAME']).strip() if pd.notna(row['SUPPLIER NAME']) else "Unknown Vendor"
            uom = str(row['UOM']).strip() if pd.notna(row['UOM']) else "NOS"
            
            # 1. Handle Vendor
            if supplier_name not in vendors:
                new_vendor = VendorMaster(name=supplier_name)
                session.add(new_vendor)
                await session.flush()
                vendors[supplier_name] = new_vendor.vendor_id
                new_vendor_count += 1
            
            vendor_id = vendors[supplier_name]
            
            # 2. Handle RM Master
            if part_no not in rms:
                new_rm = RmMaster(
                    name=desc if desc else f"Part {part_no}",
                    part_no=part_no,
                    unit_of_measurement=uom[:50],
                    description=desc
                )
                session.add(new_rm)
                await session.flush()
                rms[part_no] = new_rm
                new_rm_count += 1
                
                # 3. Create RM Vendor Mapping (Optional, price info)
                price = row['RM PRICE'] if pd.notna(row.get('RM PRICE')) else 0
                try:
                    price_val = Decimal(str(price).replace(',','').strip())
                except:
                    price_val = Decimal(0)
                    
                mapping = RmVendorMapping(
                    rm_id=new_rm.rm_id,
                    vendor_id=vendor_id,
                    standard_cost=price_val
                )
                session.add(mapping)
                
                # 4. Initialize Inventory (Optional, using CL.ST)
                closing_stock = row['CL.ST'] if pd.notna(row.get('CL.ST')) else 0
                try:
                    stock_val = Decimal(str(closing_stock).replace(',','').strip())
                except:
                    stock_val = Decimal(0)
                
                if stock_val > 0:
                    inventory = RmInventory(
                        rm_id=new_rm.rm_id,
                        store_id=main_store.store_id,
                        current_qty=stock_val
                    )
                    session.add(inventory)
        
        print(f"Inserting {new_rm_count} new raw materials and {new_vendor_count} new vendors...")
        await session.commit()
        print("Ingestion completed successfully!")

if __name__ == "__main__":
    asyncio.run(ingest_data())
