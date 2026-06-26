import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv
import uuid

load_dotenv()

async def main():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    SessionLocal = sessionmaker(engine, class_=AsyncSession)
    async with SessionLocal() as db:
        await db.execute(text("""
            INSERT INTO po_status_master (id, name, code, description)
            VALUES 
            (:id1, 'Acknowledged', 'ACKNOWLEDGED', 'PO Acknowledged by Vendor'),
            (:id2, 'In Transit', 'IN_TRANSIT', 'ASN Generated, materials in transit'),
            (:id3, 'ASN Shipped', 'ASN_SHIPPED', 'ASN has been created and shipped'),
            (:id4, 'Updated ASN Shipped', 'UPDATED_ASN_SHIPPED', 'ASN was recreated due to delay'),
            (:id5, 'Received', 'RECEIVED', 'Materials received at warehouse'),
            (:id6, 'Complete', 'COMPLETE', 'PO fulfilled completely without failure')
            ON CONFLICT (code) DO NOTHING;
        """), {
            "id1": uuid.uuid4(), 
            "id2": uuid.uuid4(),
            "id3": uuid.uuid4(),
            "id4": uuid.uuid4(),
            "id5": uuid.uuid4(),
            "id6": uuid.uuid4()
        })
        await db.commit()
        print("Statuses inserted")

asyncio.run(main())
