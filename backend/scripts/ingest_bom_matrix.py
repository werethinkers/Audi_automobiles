"""
BOM Ingestion Script
====================
Reads the 'Planing & Incoming' sheet which is a BOM matrix:
  - Rows 15, 16, 17 contain 3-level column headers (Body, Type, Variant)
  - Row 18 onwards contain parts with quantities per vehicle model
  - Columns 18..147 are the BOM product columns (each = one vehicle model variant)

For each unique (Body + Type + Variant) combination with at least one non-zero quantity,
this script creates:
  1. A ProductMaster record
  2. A BomMaster record
  3. BomDetail rows for every part that has qty > 0 for that product
"""

import asyncio
import sys
import os
import pandas as pd
import uuid
from decimal import Decimal

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from app.core.database import AsyncSessionLocal
from app.models.rm_models import RmMaster
from app.models.bom_models import ProductMaster, BomMaster, BomDetail
from sqlalchemy.future import select

file_path = "Stock report (APR-26) 30.04.26.xlsx"
sheet_name = 'Planing & Incoming'

# BOM matrix configuration
HEADER_ROW         = 17   # 0-indexed: row with column labels incl. PART NO
BODY_ROW           = 15   # Row with body-type (LEGACY, SKYLINE etc.)
TYPE_ROW           = 16   # Row with SCHOOL/STAFF
BOM_COL_START      = 18   # First BOM product column (0-indexed)
BOM_COL_END        = 147  # Last BOM product column (inclusive, 0-indexed)
PART_NO_COL        = 2    # Column index for PART NO
DESC_COL           = 3    # Column index for DESCRIPTION
UOM_COL            = 7    # Column index for UOM


async def ingest_boms():
    print("Reading Excel file...")
    df_raw = pd.read_excel(file_path, sheet_name=sheet_name, header=None)
    
    total_rows = len(df_raw)
    total_cols = len(df_raw.columns)
    print(f"Sheet size: {total_rows} rows x {total_cols} columns")

    # ── 1. Build product column map ────────────────────────────────────────
    product_cols = {}  # col_idx -> product_name string
    
    for col in range(BOM_COL_START, min(BOM_COL_END + 1, total_cols)):
        body    = str(df_raw.iloc[BODY_ROW, col]).strip() if pd.notna(df_raw.iloc[BODY_ROW, col]) else ''
        typ     = str(df_raw.iloc[TYPE_ROW, col]).strip() if pd.notna(df_raw.iloc[TYPE_ROW, col]) else ''
        variant = str(df_raw.iloc[HEADER_ROW, col]).strip() if pd.notna(df_raw.iloc[HEADER_ROW, col]) else ''
        
        if not body and not variant:
            continue
        
        # Build a clean product name e.g. "LEGACY SCHOOL 20.70 E"
        parts = [p for p in [body, typ, variant] if p and p.lower() not in ['nan', '']]
        product_name = ' - '.join(parts)
        if product_name:
            product_cols[col] = product_name

    print(f"Found {len(product_cols)} product columns")

    # ── 2. Read part rows ────────────────────────────────────────────────
    # Part rows start after header row (row 18 onwards)
    parts_data = []
    for row_idx in range(HEADER_ROW + 1, total_rows):
        row = df_raw.iloc[row_idx]
        part_no = str(row.iloc[PART_NO_COL]).strip() if pd.notna(row.iloc[PART_NO_COL]) else ''
        desc    = str(row.iloc[DESC_COL]).strip()    if pd.notna(row.iloc[DESC_COL]) else ''
        uom     = str(row.iloc[UOM_COL]).strip()     if pd.notna(row.iloc[UOM_COL]) else 'NOS'
        
        if not part_no or part_no.lower() in ['nan', '']:
            continue
        
        # Collect quantities for each product column
        qtys = {}
        for col, prod_name in product_cols.items():
            if col >= total_cols:
                continue
            val = row.iloc[col]
            try:
                qty = float(val)
                if qty > 0:
                    qtys[prod_name] = qty
            except (ValueError, TypeError):
                pass
        
        parts_data.append({
            'part_no': part_no,
            'desc':    desc,
            'uom':     uom[:50],
            'qtys':    qtys  # {product_name: qty}
        })

    print(f"Found {len(parts_data)} parts with data")
    
    # Unique product names that have at least one part
    all_product_names = set()
    for p in parts_data:
        all_product_names.update(p['qtys'].keys())
    print(f"Products with at least one component: {len(all_product_names)}")

    # ── 3. Database ingestion ────────────────────────────────────────────
    async with AsyncSessionLocal() as session:
        # Load existing RM masters for lookup by part_no
        rm_result = await session.execute(select(RmMaster))
        rm_map = {rm.part_no: rm for rm in rm_result.scalars().all() if rm.part_no}
        print(f"Found {len(rm_map)} RMs in database")

        # Clear existing products / BOMs to avoid duplication on re-run
        bom_result = await session.execute(select(BomMaster))
        existing_boms = bom_result.scalars().all()
        if existing_boms:
            print(f"Deleting {len(existing_boms)} existing BOMs...")
            for b in existing_boms:
                await session.delete(b)
            await session.flush()

        prod_result = await session.execute(select(ProductMaster))
        existing_products = prod_result.scalars().all()
        if existing_products:
            print(f"Deleting {len(existing_products)} existing products...")
            for p in existing_products:
                await session.delete(p)
            await session.flush()

        # Create Products and BOMs
        product_db_map = {}  # product_name -> ProductMaster
        bom_db_map     = {}  # product_name -> BomMaster

        print("\nCreating products and BOMs...")
        for prod_name in sorted(all_product_names):
            # Create product
            product = ProductMaster(
                name=prod_name[:255],
                product_code=prod_name.replace(' ', '_').replace('-', '_')[:100],
                unit_of_measurement='NOS',
                description=f'Auto-imported from Stock Report - {prod_name}'
            )
            session.add(product)
            await session.flush()
            product_db_map[prod_name] = product

            # Create BOM header
            bom_number = f"BOM-{prod_name.replace(' ', '-').replace('/', '-')[:80]}"
            bom = BomMaster(
                product_id=product.product_id,
                bom_number=bom_number,
                description=f'BOM for {prod_name} - imported from Planning & Incoming sheet'
            )
            session.add(bom)
            await session.flush()
            bom_db_map[prod_name] = bom

        print(f"Created {len(product_db_map)} products and BOMs")

        # Create BOM Details
        detail_count = 0
        missing_rm_parts = set()
        
        for part in parts_data:
            part_no = part['part_no']
            rm = rm_map.get(part_no)
            
            if not rm:
                missing_rm_parts.add(part_no)
                continue
            
            for prod_name, qty in part['qtys'].items():
                bom = bom_db_map.get(prod_name)
                if not bom:
                    continue
                
                detail = BomDetail(
                    bom_id=bom.bom_id,
                    rm_id=rm.rm_id,
                    quantity=Decimal(str(qty)),
                    uom=part['uom'],
                    scrap_percentage=Decimal('0')
                )
                session.add(detail)
                detail_count += 1

        print(f"\nCreating {detail_count} BOM detail lines...")
        
        if missing_rm_parts:
            print(f"Warning: {len(missing_rm_parts)} parts from Excel not found in RM Master (skipped)")
        
        await session.commit()
        print("\n✓ BOM ingestion completed successfully!")
        print(f"  - {len(product_db_map)} Products created")
        print(f"  - {len(bom_db_map)} BOMs created")
        print(f"  - {detail_count} BOM component lines created")


if __name__ == "__main__":
    asyncio.run(ingest_boms())
