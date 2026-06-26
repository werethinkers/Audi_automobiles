import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text
from dotenv import load_dotenv
import uuid
import random
from datetime import datetime, timedelta, timezone

load_dotenv()
from app.models.vendor_portal import RejectionLog, NCRLog
from app.models.rm_models import RmPurchaseOrder, RmPoDetail, RmReceivingLog

async def main():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    SessionLocal = sessionmaker(engine, class_=AsyncSession)
    async with SessionLocal() as db:
        grns_res = await db.execute(select(RmReceivingLog).limit(10))
        grns = list(grns_res.scalars().all())
        
        # Get reason codes
        res_rc = await db.execute(text("SELECT reason_code FROM rejection_reason_master"))
        reasons = [r[0] for r in res_rc.fetchall()]
        if not reasons:
            print("No reason codes found in DB!")
            return
            
        for i, grn in enumerate(grns[:5]):
            po = await db.get(RmPurchaseOrder, grn.po_id)
            
            rej = RejectionLog(
                grn_id=grn.grn_id,
                vendor_id=po.vendor_id,
                rln=f"RLN-202606-{random.randint(1000, 9999)}",
                reason_code=random.choice(reasons),
                total_qty=random.uniform(5.0, 50.0),
                status="PENDING_REVIEW",
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 15))
            )
            db.add(rej)
            await db.flush()
            
            if i < 3:
                ncr = NCRLog(
                    rejection_id=rej.rejection_id,
                    vendor_id=po.vendor_id,
                    ncr_number=f"NCR-2026-{random.randint(1000, 9999)}",
                    defect_description=f"Recurrent failure in dimensional tolerance for batch. Please submit an 8D report.",
                    car_due=datetime.now(timezone.utc) + timedelta(days=5),
                    status="OPEN",
                    created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 5))
                )
                db.add(ncr)
                
        await db.commit()
        print("Rejections & NCRs seeded successfully!")

asyncio.run(main())
