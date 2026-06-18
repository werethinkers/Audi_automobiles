import os
import sys
import asyncio
import pandas as pd
import uuid
from datetime import datetime, timezone

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal
from app.models.rm_models import VendorMaster
from sqlalchemy import select


def normalize_name(val):
    """Strip, collapse spaces, title-case for dedup key."""
    if pd.isna(val):
        return ""
    return " ".join(str(val).strip().split()).upper()


def display_name(val):
    """Return cleaned display name (strip but preserve original casing)."""
    if pd.isna(val):
        return ""
    return " ".join(str(val).strip().split())


async def ingest_vendors(file_path: str):
    print("Reading Excel file...")
    df = pd.read_excel(file_path, sheet_name="MASTER", header=2)
    df.columns = [c.strip() for c in df.columns]

    supplier_col = "SUPPLIER NAME"
    if supplier_col not in df.columns:
        print(f"ERROR: Column '{supplier_col}' not found. Available: {df.columns.tolist()}")
        sys.exit(1)

    # Collect unique normalized supplier names → display name mapping
    name_map: dict[str, str] = {}  # normalized → best display name
    for raw in df[supplier_col].dropna():
        norm = normalize_name(raw)
        display = display_name(raw)
        if norm and norm not in name_map:
            name_map[norm] = display

    print(f"Found {len(name_map)} unique suppliers after normalization.")

    async with AsyncSessionLocal() as session:
        # Load existing vendors
        result = await session.execute(select(VendorMaster))
        existing = result.scalars().all()
        existing_names = {normalize_name(v.name): v for v in existing}

        inserted = 0
        skipped = 0

        for norm_name, display in name_map.items():
            if norm_name in existing_names:
                skipped += 1
                print(f"  [SKIP] Already exists: {display}")
                continue

            vendor = VendorMaster(
                vendor_id=uuid.uuid4(),
                name=display,
                contact_person=None,
                phone=None,
                email=None,
                gst_number=None,
                address_line1=None,
                city=None,
                state=None,
                payment_terms=None,
                is_active=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            session.add(vendor)
            existing_names[norm_name] = vendor
            inserted += 1
            print(f"  [INSERT] {display}")

        await session.commit()
        print("\n" + "=" * 40)
        print("       VENDOR INGESTION SUMMARY")
        print("=" * 40)
        print(f"  Vendors Inserted : {inserted}")
        print(f"  Vendors Skipped  : {skipped} (already exist)")
        print(f"  Total Unique     : {len(name_map)}")
        print("=" * 40)
        print("Done! All vendors committed to database.")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Ingest Vendor data from Excel workbook.")
    parser.add_argument(
        "--file",
        type=str,
        default="Stock report (APR-26) 30.04.26.xlsx",
        help="Path to the Excel file.",
    )
    args = parser.parse_args()
    asyncio.run(ingest_vendors(args.file))
