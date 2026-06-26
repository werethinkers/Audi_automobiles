import os

file_path = "app/modules/vendor_portal/service.py"

with open(file_path, "r") as f:
    content = f.read()

# Add imports
content = content.replace("from sqlalchemy import select, and_", "from sqlalchemy import select, and_, func, case")
content = content.replace("RejectionLog", "RejectionLog, NCRLog")

# Append new functions
new_funcs = """
import random
from decimal import Decimal

async def get_live_scorecard(db: AsyncSession, vendor_id: uuid.UUID, start_date: datetime.date, end_date: datetime.date) -> dict:
    # 1. Deliveries (Total & On Time)
    del_stmt = select(
        func.count(RmReceivingLog.grn_id).label("total"),
        func.sum(
            case((RmReceivingLog.received_date <= RmPurchaseOrder.expected_delivery_date, 1), else_=0)
        ).label("on_time"),
        func.avg(RmReceivingLog.received_date - RmPurchaseOrder.order_date).label("avg_lead_time")
    ).select_from(RmReceivingLog).join(RmPurchaseOrder, RmReceivingLog.po_id == RmPurchaseOrder.po_id)\\
     .where(RmReceivingLog.vendor_id == vendor_id)\\
     .where(RmReceivingLog.received_date >= start_date)\\
     .where(RmReceivingLog.received_date <= end_date)
     
    del_res = await db.execute(del_stmt)
    del_row = del_res.one()
    
    deliveries_total = del_row.total or 0
    deliveries_on_time = int(del_row.on_time) if del_row.on_time else 0
    
    # Handle PostgreSQL interval or integer return from date math
    # average of (date - date) is usually an integer or Decimal of days
    avg_lead_time_val = del_row.avg_lead_time
    if hasattr(avg_lead_time_val, "days"):
        avg_lead_time_days = Decimal(avg_lead_time_val.days)
    elif avg_lead_time_val is not None:
        avg_lead_time_days = Decimal(float(avg_lead_time_val))
    else:
        avg_lead_time_days = Decimal('0.0')

    # 2. Batches (Total & First Pass)
    # A batch is a GrnDetail line. First pass means rejected_qty == 0
    batch_stmt = select(
        func.count(GrnDetail.grn_detail_id).label("total"),
        func.sum(
            case((func.coalesce(GrnDetail.rejected_qty, 0) == 0, 1), else_=0)
        ).label("first_pass")
    ).select_from(GrnDetail).join(RmReceivingLog, GrnDetail.grn_id == RmReceivingLog.grn_id)\\
     .where(RmReceivingLog.vendor_id == vendor_id)\\
     .where(RmReceivingLog.received_date >= start_date)\\
     .where(RmReceivingLog.received_date <= end_date)
     
    batch_res = await db.execute(batch_stmt)
    batch_row = batch_res.one()
    
    batches_total = batch_row.total or 0
    batches_first_pass = int(batch_row.first_pass) if batch_row.first_pass else 0

    # 3. Rejections
    rej_stmt = select(func.count(RejectionLog.rejection_id))\\
        .where(RejectionLog.vendor_id == vendor_id)\\
        .where(func.date(RejectionLog.created_at) >= start_date)\\
        .where(func.date(RejectionLog.created_at) <= end_date)
    rejection_count = (await db.execute(rej_stmt)).scalar() or 0

    # 4. NCRs
    ncr_stmt = select(func.count(NCRLog.ncr_id))\\
        .where(NCRLog.vendor_id == vendor_id)\\
        .where(func.date(NCRLog.created_at) >= start_date)\\
        .where(func.date(NCRLog.created_at) <= end_date)
    ncr_count = (await db.execute(ncr_stmt)).scalar() or 0
    
    on_time_pct = Decimal(deliveries_on_time) / Decimal(deliveries_total) * Decimal('100.0') if deliveries_total > 0 else Decimal('0.0')
    first_pass_pct = Decimal(batches_first_pass) / Decimal(batches_total) * Decimal('100.0') if batches_total > 0 else Decimal('0.0')

    return {
        "scorecard_id": uuid.uuid4(),
        "period_start": start_date,
        "period_end": end_date,
        "deliveries_total": deliveries_total,
        "deliveries_on_time": deliveries_on_time,
        "batches_total": batches_total,
        "batches_first_pass": batches_first_pass,
        "rejection_count": rejection_count,
        "ncr_count": ncr_count,
        "avg_lead_time_days": avg_lead_time_days,
        "on_time_pct": round(on_time_pct, 1),
        "first_pass_pct": round(first_pass_pct, 1)
    }

async def generate_asn_number(db: AsyncSession) -> str:
    date_str = datetime.utcnow().strftime('%Y%m%d')
    hex_str = uuid.uuid4().hex[:4].upper()
    return f"ASN-{date_str}-{hex_str}"
"""

with open(file_path, "w") as f:
    f.write(content + "\n" + new_funcs)

print("service.py patched successfully.")
