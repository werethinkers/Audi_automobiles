import os
import sys
import asyncio
import pandas as pd
import uuid
from datetime import datetime, timezone

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal
from app.models.rm_models import StationMaster
from sqlalchemy import select

def normalize_name(val):
    if pd.isna(val):
        return ""
    return " ".join(str(val).strip().split()).upper()


def display_name(val):
    if pd.isna(val):
        return ""
    return " ".join(str(val).strip().split())


async def ingest_stations(file_path: str):
    print("Reading Excel file...")

    df = pd.read_excel(
    file_path,
    sheet_name="Planing & Incoming",
    header=17
    )

    # convert every column name to string first
    df.columns = [str(c).strip().upper() for c in df.columns]
    print(df.columns.tolist())

    station_col = "STATION"
    print(df["STATION"].dropna().unique())

    if station_col not in df.columns:
        print(f"ERROR: Column '{station_col}' not found.")
        print(df.columns.tolist())
        sys.exit(1)

    # Unique stations
    station_map = {}

    for raw in df[station_col].dropna():
        norm = normalize_name(raw)
        display = display_name(raw)

        if norm and norm not in station_map:
            station_map[norm] = display

    print(f"Found {len(station_map)} unique stations.")

    async with AsyncSessionLocal() as session:

        result = await session.execute(select(StationMaster))
        existing = result.scalars().all()

        existing_names = {
            normalize_name(s.station_name): s
            for s in existing
        }

        inserted = 0
        skipped = 0
        sequence_no = len(existing_names) + 1

        for norm_name, display in station_map.items():

            if norm_name in existing_names:
                skipped += 1
                print(f"[SKIP] {display}")
                continue

            station = StationMaster(
                station_id=uuid.uuid4(),
                station_code=f"ST{sequence_no:03d}",
                station_name=display,
                station_description=None,
                operation_id=None,
                primary_operator_id=None,
                sequence_no=sequence_no,
                requires_qa=True,
                is_rework_station=False,
                backflush_enabled=False,
                standard_cycle_time_min=None,
                is_active=True,
                custom_fields={},
                created_at=datetime.now(timezone.utc)
            )

            session.add(station)

            existing_names[norm_name] = station

            inserted += 1
            sequence_no += 1

            print(f"[INSERT] {display}")

        await session.commit()

        print("\n" + "=" * 40)
        print("     STATION INGESTION SUMMARY")
        print("=" * 40)
        print(f"Inserted : {inserted}")
        print(f"Skipped  : {skipped}")
        print(f"Total Unique : {len(station_map)}")
        print("=" * 40)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Ingest Station data from Excel workbook."
    )

    parser.add_argument(
        "--file",
        type=str,
        default="Stock report (APR-26) 30.04.26.xlsx",
        help="Path to Excel file"
    )

    args = parser.parse_args()

    asyncio.run(ingest_stations(args.file))