import asyncio
import uuid
import os
import sys
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.rm_models import (
    ProcurementSourceMaster,
    MaterialTypeMaster,
    PoStatusMaster,
    StoreMaster
)
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set in backend/.env")

engine = create_async_engine(DATABASE_URL)
Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def seed():
    async with Session() as db:
        # 1. Procurement Sources
        sources = ['BOP', 'In-House BOP', 'On-Plant', 'Imported', 'Consignment']
        for name in sources:
            db.add(ProcurementSourceMaster(
                id=uuid.uuid4(),
                name=name,
                description=f"{name} procurement source",
                is_active=True,
                created_at=datetime.now(timezone.utc)
            ))

        # 2. Material Types
        types = ['Raw Material', 'Consumable', 'Semi-Finished', 'Packing Material', 'Capital Item']
        for name in types:
            db.add(MaterialTypeMaster(
                id=uuid.uuid4(),
                name=name,
                description=f"{name} material type",
                is_active=True,
                created_at=datetime.now(timezone.utc)
            ))

        # 3. PO Statuses
        statuses = [
            ('DRAFT', 'Draft'),
            ('PENDING_APPROVAL', 'Pending Approval'),
            ('BLOCKED', 'Blocked - Price Variance'),
            ('RELEASED', 'Released'),
            ('PARTIALLY_RECEIVED', 'Partially Received'),
            ('COMPLETED', 'Completed'),
            ('CANCELLED', 'Cancelled'),
        ]
        for code, name in statuses:
            db.add(PoStatusMaster(
                id=uuid.uuid4(),
                code=code,
                name=name,
                description=f"{name} status",
                created_at=datetime.now(timezone.utc)
            ))

        # 4. Default Stores
        stores = [
            ('Main Store', 'Main warehouse facility'),
            ('Floor Inventory', 'Shop floor production area'),
            ('Rejection Store', 'Defective or rejected goods holding'),
            ('QA Quarantine', 'Incoming goods quality inspection area'),
        ]
        for name, location in stores:
            db.add(StoreMaster(
                store_id=uuid.uuid4(),
                store_name=name,
                location=location,
                is_active=True,
                created_at=datetime.now(timezone.utc)
            ))

        await db.commit()
        print('Seed data inserted successfully.')

if __name__ == "__main__":
    asyncio.run(seed())
