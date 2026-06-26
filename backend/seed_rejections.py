import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from dotenv import load_dotenv
import uuid
import random
from datetime import datetime, timedelta

load_dotenv()
from app.models.vendor_portal import RejectionLog, NCRLog
from app.models.rm_models import RmPurchaseOrder, RmPoDetail

async def main():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    SessionLocal = sessionmaker(engine, class_=AsyncSession)
    async with SessionLocal() as db:
        # Find some PO details
        po_details_res = await db.execute(select(RmPoDetail).join(RmPurchaseOrder).limit(10))
        po_details = list(po_details_res.scalars().all())
        
        if not po_details:
            print("No PO details found to seed rejections!")
            return
            
        for i, detail in enumerate(po_details[:5]):
            # Get vendor from PO
            po = await db.get(RmPurchaseOrder, detail.po_id)
            
            # Create a rejection
            rej = RejectionLog(
                rejection_number=f"REJ-202606-{random.randint(1000, 9999)}",
                grn_id=uuid.uuid4(), # Fake GRN for now since we're just seeding UI
                vendor_id=po.vendor_id,
                po_detail_id=detail.po_detail_id,
                rejected_qty=random.uniform(5.0, 50.0),
                rejection_reason=random.choice(["Material deformed", "Failed thickness tolerance", "Corrosion detected", "Incorrect alloy specs"]),
                rejection_date=datetime.utcnow() - timedelta(days=random.randint(1, 15)),
                status="PENDING_REVIEW"
            )
            db.add(rej)
            await db.flush()
            
            # Create an NCR for the first 3
            if i < 3:
                ncr = NCRLog(
                    ncr_number=f"NCR-2026-{random.randint(1000, 9999)}",
                    vendor_id=po.vendor_id,
                    related_rejection_id=rej.rejection_id,
                    severity=random.choice(["HIGH", "MEDIUM", "LOW"]),
                    description=f"Recurrent failure in dimensional tolerance for batch. Please submit an 8D report.",
                    required_action="Submit CAPA report within 5 business days.",
                    status="OPEN"
                )
                db.add(ncr)
                
        await db.commit()
        print("Rejections & NCRs seeded successfully!")

asyncio.run(main())
