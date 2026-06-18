import os
import sys
import argparse
import asyncio
import pandas as pd
import numpy as np
from datetime import datetime, timezone
import uuid
import csv

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal
from app.models.rm_models import MaterialTypeMaster, RmMaster
from sqlalchemy import select, update

def clean_part_no(val):
    if pd.isna(val):
        return ""
    # Convert to string and strip spaces
    s = str(val).strip()
    # Check if representation is like 1234.0, convert to int-like string
    if s.endswith(".0"):
        s = s[:-2]
    return s

def clean_description(val):
    if pd.isna(val):
        return ""
    s = str(val).strip()
    # Remove duplicate spaces
    s = " ".join(s.split())
    return s

def clean_uom(val):
    if pd.isna(val):
        return ""
    return str(val).strip().upper()

def clean_grup_head(val):
    if pd.isna(val):
        return ""
    return str(val).strip().upper()

def detect_sheet_and_header(file_path):
    """
    Programmatically locate the header row containing columns similar to:
    PART NO, DESCRIPTION, Grup Head, UOM.
    Scans prioritized sheet names first, then all sheets.
    """
    xl = pd.ExcelFile(file_path)
    required_cols = {"partno", "description", "gruphead", "uom"}
    
    # Priority sheet names containing key terms
    sheet_priority = []
    other_sheets = []
    for sheet_name in xl.sheet_names:
        low_name = sheet_name.lower()
        if "master" in low_name or "plan" in low_name or "incoming" in low_name or "order" in low_name:
            sheet_priority.append(sheet_name)
        else:
            other_sheets.append(sheet_name)
            
    # First attempt: search for all 4 columns matched
    for sheet_name in (sheet_priority + other_sheets):
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name, nrows=100, header=None)
            for idx, row in df.iterrows():
                # Normalize values in the row to alphanumeric lowercase
                row_vals = [str(x).strip().lower().replace('.', '').replace(' ', '') if pd.notna(x) else "" for x in row]
                
                col_indices = {}
                for val_idx, val in enumerate(row_vals):
                    if val == "partno" or val == "partno.":
                        col_indices["part_no"] = val_idx
                    elif val == "description":
                        col_indices["description"] = val_idx
                    elif val in ("gruphead", "grouphead"):
                        col_indices["grup_head"] = val_idx
                    elif val == "uom":
                        col_indices["uom"] = val_idx
                        
                if len(col_indices) == 4:
                    return sheet_name, idx, col_indices
        except Exception:
            continue
            
    # Second attempt (fallback): search for at least 3 columns matched
    for sheet_name in (sheet_priority + other_sheets):
        try:
            df = pd.read_excel(file_path, sheet_name=sheet_name, nrows=100, header=None)
            for idx, row in df.iterrows():
                row_vals = [str(x).strip().lower().replace('.', '').replace(' ', '') if pd.notna(x) else "" for x in row]
                
                col_indices = {}
                for val_idx, val in enumerate(row_vals):
                    if val == "partno" or val == "partno.":
                        col_indices["part_no"] = val_idx
                    elif val == "description":
                        col_indices["description"] = val_idx
                    elif val in ("gruphead", "grouphead"):
                        col_indices["grup_head"] = val_idx
                    elif val == "uom":
                        col_indices["uom"] = val_idx
                        
                if len(col_indices) >= 3:
                    return sheet_name, idx, col_indices
        except Exception:
            continue
            
    raise ValueError("Could not programmatically locate a sheet containing the required header columns (PART NO, DESCRIPTION, Grup Head, UOM).")

async def ingest_pipeline(file_path, dry_run=False):
    # Detect sheet and header
    print("Detecting Excel sheet and header row...")
    try:
        sheet_name, header_row_idx, col_map = detect_sheet_and_header(file_path)
        print(f"Detected Sheet: '{sheet_name}' at header row {header_row_idx + 1} (Excel row number)")
        print(f"Detected columns index map: {col_map}")
    except Exception as e:
        print(f"Error during sheet detection: {e}")
        sys.exit(1)
        
    # Read Excel sheet
    df = pd.read_excel(file_path, sheet_name=sheet_name, header=header_row_idx)
    
    # Map column names to index positions dynamically
    part_col_name = df.columns[col_map["part_no"]]
    desc_col_name = df.columns[col_map["description"]]
    grup_col_name = df.columns[col_map["grup_head"]]
    uom_col_name = df.columns[col_map["uom"]]
    
    print("Initializing database connection...")
    async with AsyncSessionLocal() as session:
        # Load existing material types
        stmt_mt = select(MaterialTypeMaster)
        res_mt = await session.execute(stmt_mt)
        existing_mts = res_mt.scalars().all()
        material_type_lookup = {mt.type_name.strip().upper(): mt.type_id for mt in existing_mts}
        
        # Load existing RMs
        stmt_rm = select(RmMaster)
        res_rm = await session.execute(stmt_rm)
        existing_rms = res_rm.scalars().all()
        rm_lookup = {rm.part_number.strip(): rm for rm in existing_rms if rm.part_number}
        
        # Counters
        mt_created = 0
        mt_updated = 0
        rm_inserted = 0
        rm_updated = 0
        rm_skipped = 0
        total_processed = 0
        total_errors = 0
        
        # Records for errors CSV
        errors_log = []
        
        # Set to track duplicates within this Excel run
        processed_part_nos_in_run = set()
        
        # Data Quality check lists
        duplicate_part_nos_in_file = {}
        cleaned_uom_mismatches = 0
        missing_uom_or_desc_errors = 0
        
        # Extract and upsert Material Types (Grup Heads) first for performance
        excel_grup_heads = set()
        for _, row in df.iterrows():
            gh = clean_grup_head(row[grup_col_name])
            if gh:
                excel_grup_heads.add(gh)

        print(f"Discovered {len(excel_grup_heads)} unique material types (Grup Heads) in Excel. Upserting them...")
        for grup_head in excel_grup_heads:
            try:
                async with session.begin_nested():
                    if grup_head in material_type_lookup:
                        mt_id = material_type_lookup[grup_head]
                        stmt_mt_up = update(MaterialTypeMaster).where(MaterialTypeMaster.type_id == mt_id).values(
                            description=grup_head,
                            is_active=True
                        )
                        await session.execute(stmt_mt_up)
                        mt_updated += 1
                    else:
                        mt_id = uuid.uuid4()
                        new_mt = MaterialTypeMaster(
                            type_id=mt_id,
                            type_code=grup_head[:40].upper().replace(' ', '_'),
                            type_name=grup_head,
                            description=grup_head,
                            is_active=True,
                            created_at=datetime.now(timezone.utc)
                        )
                        session.add(new_mt)
                        material_type_lookup[grup_head] = mt_id
                        mt_created += 1
            except Exception as e:
                print(f"Warning: Failed to upsert material type '{grup_head}': {e}")
                errors_log.append({
                    'row_number': 0,
                    'part_no': f"MT_{grup_head}",
                    'error': f"Failed to upsert material type: {e}"
                })
                total_errors += 1

        print(f"Processing {len(df)} rows from Excel...")
        
        for idx, row in df.iterrows():
            total_processed += 1
            # Excel row number is header_row_idx + 2 + idx (1-indexed, skipping header)
            excel_row_num = header_row_idx + 2 + idx
            
            # 1. Clean part number
            part_no_raw = row[part_col_name]
            part_no = clean_part_no(part_no_raw)
            
            # 2. Clean description
            desc_raw = row[desc_col_name]
            desc = clean_description(desc_raw)
            
            # 3. Clean UOM
            uom_raw = row[uom_col_name]
            uom = clean_uom(uom_raw)
            
            # 4. Clean Grup Head
            grup_head_raw = row[grup_col_name]
            grup_head = clean_grup_head(grup_head_raw)
            
            # Check for skips
            if not part_no or not desc:
                rm_skipped += 1
                continue
                
            # Data Quality: check for duplicate part_no inside Excel
            if part_no in processed_part_nos_in_run:
                if part_no not in duplicate_part_nos_in_file:
                    duplicate_part_nos_in_file[part_no] = 1
                duplicate_part_nos_in_file[part_no] += 1
            processed_part_nos_in_run.add(part_no)
            
            # Data Quality: check for UOM mismatch / spacing
            if uom_raw != uom:
                cleaned_uom_mismatches += 1
                
            if not uom:
                missing_uom_or_desc_errors += 1
                errors_log.append({
                    'row_number': excel_row_num,
                    'part_no': part_no,
                    'error': "UOM cannot be empty"
                })
                total_errors += 1
                continue
                
            # Database UPSERT logic utilizing SAVEPOINT
            added_rm = False
            
            try:
                # We start a nested subtransaction (SAVEPOINT) to isolate row failures
                async with session.begin_nested():
                    # 1. Lookup Material Type (Grup Head)
                    mt_id = None
                    if grup_head:
                        mt_id = material_type_lookup.get(grup_head)
                            
                    # 2. Handle RM Master Record
                    if part_no in rm_lookup:
                        # Update existing record
                        rm_rec = rm_lookup[part_no]
                        rm_rec.part_name = desc
                        rm_rec.description = desc
                        rm_rec.unit_of_measurement = uom
                        rm_rec.material_type_id = mt_id
                        rm_rec.updated_at = datetime.now(timezone.utc)
                        rm_updated += 1
                    else:
                        # Insert new record
                        rm_id = uuid.uuid4()
                        new_rm = RmMaster(
                            rm_id=rm_id,
                            part_name=desc,
                            part_number=part_no,
                            unit_of_measurement=uom,
                            description=desc,
                            material_type_id=mt_id,
                            procurement_source_id=None,
                            minimum_stock=0,
                            lead_time_days=None,
                            is_active=True,
                            created_at=datetime.now(timezone.utc),
                            updated_at=datetime.now(timezone.utc)
                        )
                        session.add(new_rm)
                        # Cache in-memory to prevent multiple inserts for duplicates in Excel
                        rm_lookup[part_no] = new_rm
                        added_rm = True
                        rm_inserted += 1
                        
            except Exception as e:
                # Rollback of the nested transaction happens automatically.
                # Revert any cached state we added in this row.
                if added_rm:
                    rm_lookup.pop(part_no, None)
                    rm_inserted -= 1
                    
                errors_log.append({
                    'row_number': excel_row_num,
                    'part_no': part_no,
                    'error': str(e)
                })
                total_errors += 1
                continue

                
        # Write errors CSV if there were errors
        errors_file_path = "ingestion_errors.csv"
        try:
            with open(errors_file_path, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=["row_number", "part_no", "error"])
                writer.writeheader()
                for err in errors_log:
                    writer.writerow(err)
            print(f"Error log generated at: {os.path.abspath(errors_file_path)}")
        except Exception as csv_err:
            print(f"Warning: could not write error log: {csv_err}")
            
        # Summary log output
        print("\n" + "="*40)
        print("          INGESTION LOG SUMMARY")
        print("="*40)
        print(f"Material Types Created : {mt_created}")
        print(f"Material Types Updated : {mt_updated}")
        print(f"RM Inserted            : {rm_inserted}")
        print(f"RM Updated             : {rm_updated}")
        print(f"RM Skipped             : {rm_skipped}")
        print(f"Total Processed        : {total_processed}")
        print(f"Total Errors           : {total_errors}")
        print("="*40)
        
        # Dry-run validation report details
        if dry_run:
            print("\n" + "="*40)
            print("       DRY-RUN VALIDATION REPORT")
            print("="*40)
            print(f"Material Types Discovered: {len(material_type_lookup)}")
            print(f"RM Records Discovered    : {len(processed_part_nos_in_run)}")
            print(f"Rows Skipped             : {rm_skipped}")
            
            print("\nPotential Data Quality Issues:")
            if duplicate_part_nos_in_file:
                print(f"  - Duplicate part numbers in Excel file: {len(duplicate_part_nos_in_file)} part numbers appeared multiple times.")
                for d_part, count in list(duplicate_part_nos_in_file.items())[:5]:
                    print(f"    * Part '{d_part}' occurs {count} times.")
                if len(duplicate_part_nos_in_file) > 5:
                    print(f"    * ...and {len(duplicate_part_nos_in_file) - 5} more.")
            else:
                print("  - No duplicate part numbers in Excel file.")
                
            if cleaned_uom_mismatches > 0:
                print(f"  - UOM required cleaning (spaces/case normalized): {cleaned_uom_mismatches} times.")
            else:
                print("  - All UOMs were clean.")
                
            if missing_uom_or_desc_errors > 0:
                print(f"  - Rows with missing/empty UOM fields: {missing_uom_or_desc_errors} errors.")
            else:
                print("  - No rows had missing UOM or Description fields.")
                
            print("="*40)
            
            print("\nDRY-RUN mode active. Rolling back all database transaction changes.")
            await session.rollback()
        else:
            print("\nCOMMITTING all changes to database...")
            await session.commit()
            print("Database transaction committed successfully!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest RM Master data from Excel workbook.")
    parser.add_argument("--file", type=str, default="Stock report (APR-26) 30.04.26.xlsx", help="Path to the Excel file.")
    parser.add_argument("--dry-run", action="store_true", help="Perform validation checks and database transaction dry-run.")
    args = parser.parse_args()
    
    asyncio.run(ingest_pipeline(args.file, dry_run=args.dry_run))
