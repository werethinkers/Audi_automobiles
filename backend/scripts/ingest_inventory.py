import os
import sys
import asyncio
import pandas as pd
import uuid
from datetime import datetime, timezone
from decimal import Decimal

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal
from app.models.rm_models import RmMaster, StoreMaster, RmInventory, RmInventoryLog
from sqlalchemy import select


def clean_part_no(val):
    if pd.isna(val):
        return ""
    s = str(val).strip()
    if s.endswith(".0"):
        s = s[:-2]
    return s


async def ingest_inventory(file_path: str):
    print("Reading Excel ORDER sheet...")
    df = pd.read_excel(file_path, sheet_name="ORDER", header=2)
    df.columns = [str(c).strip() for c in df.columns]

    print(f"Columns: {df.columns.tolist()[:12]}")
    print(f"Total rows: {len(df)}")

    # ── 1. Clean & filter rows ────────────────────────────────────────────────
    df["part_no"] = df["PART NO ."].apply(clean_part_no)
    df["closing_stock"] = pd.to_numeric(df["Closing Stock"], errors="coerce").fillna(0)

    # Keep only rows with a valid part_no
    df = df[df["part_no"].notna() & (df["part_no"] != "") & (df["part_no"] != "nan")]
    print(f"Rows with valid part_no: {len(df)}")
    print(f"Rows with closing_stock > 0: {(df['closing_stock'] > 0).sum()}")

    async with AsyncSessionLocal() as session:

        # ── 2. Ensure a default Store exists ─────────────────────────────────
        result = await session.execute(select(StoreMaster))
        stores = result.scalars().all()

        if stores:
            store = stores[0]
            print(f"\nUsing existing store: '{store.store_name}' ({store.store_id})")
        else:
            store = StoreMaster(
                store_id=uuid.uuid4(),
                store_name="Main Warehouse",
                location="Indore",
                is_active=True,
                created_at=datetime.now(timezone.utc),
            )
            session.add(store)
            await session.flush()
            print(f"\nCreated new store: 'Main Warehouse' ({store.store_id})")

        store_id = store.store_id

        # ── 3. Load all RM records (keyed by part_no) ─────────────────────────
        result = await session.execute(select(RmMaster))
        all_rms = result.scalars().all()
        rm_lookup = {rm.part_no.strip(): rm for rm in all_rms if rm.part_no}
        print(f"RM records in DB: {len(rm_lookup)}")

        # ── 4. Load existing inventory rows ───────────────────────────────────
        result = await session.execute(
            select(RmInventory).where(RmInventory.store_id == store_id)
        )
        existing_inv = {str(inv.rm_id): inv for inv in result.scalars().all()}
        print(f"Existing inventory rows for this store: {len(existing_inv)}")

        # ── 5. Upsert inventory rows ─────────────────────────────────────────
        inserted = 0
        updated = 0
        skipped_no_rm = 0
        skipped_zero = 0

        now = datetime.now(timezone.utc)

        for _, row in df.iterrows():
            part_no = row["part_no"]
            closing_qty = Decimal(str(row["closing_stock"]))

            # Skip items with no stock (optional — remove this check to include zero-stock items)
            if closing_qty <= 0:
                skipped_zero += 1
                continue

            rm = rm_lookup.get(part_no)
            if not rm:
                skipped_no_rm += 1
                continue

            rm_id_str = str(rm.rm_id)

            if rm_id_str in existing_inv:
                # Update existing balance
                inv = existing_inv[rm_id_str]
                inv.current_qty = closing_qty
                inv.last_updated = now
                updated += 1
            else:
                # Insert new inventory row
                inv = RmInventory(
                    inventory_id=uuid.uuid4(),
                    rm_id=rm.rm_id,
                    store_id=store_id,
                    current_qty=closing_qty,
                    reserved_qty=Decimal("0"),
                    in_transit_qty=Decimal("0"),
                    last_updated=now,
                )
                session.add(inv)

                # Also write an opening balance log entry
                session.add(RmInventoryLog(
                    log_id=uuid.uuid4(),
                    rm_id=rm.rm_id,
                    store_id=store_id,
                    transaction_type="ADJUSTMENT_ADD",
                    qty=closing_qty,
                    balance_before=Decimal("0"),
                    balance_after=closing_qty,
                    reference_type="OPENING_BALANCE",
                    reference_id=None,
                    remarks="Imported from Stock Report APR-26",
                    created_at=now,
                ))

                existing_inv[rm_id_str] = inv
                inserted += 1

        await session.commit()

        print("\n" + "=" * 45)
        print("       INVENTORY INGESTION SUMMARY")
        print("=" * 45)
        print(f"  Store              : {store.store_name}")
        print(f"  Inventory Inserted : {inserted}")
        print(f"  Inventory Updated  : {updated}")
        print(f"  Skipped (no RM)    : {skipped_no_rm}  (part not in rm_master)")
        print(f"  Skipped (zero qty) : {skipped_zero}")
        print("=" * 45)
        print("Done! Inventory committed to database.")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Ingest Inventory (closing stock) from Excel ORDER sheet.")
    parser.add_argument(
        "--file",
        type=str,
        default="Stock report (APR-26) 30.04.26.xlsx",
        help="Path to the Excel file.",
    )
    args = parser.parse_args()
    asyncio.run(ingest_inventory(args.file))
