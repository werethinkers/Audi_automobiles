import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

async def run():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    SessionLocal = sessionmaker(engine, class_=AsyncSession)
    async with SessionLocal() as db:
        res = await db.execute(text("SELECT asn_id, asn_number, po_id, vendor_id, status FROM asn_log"))
        rows = res.fetchall()
        print("ASNs in DB:")
        for row in rows:
            print(f"ASN: {row.asn_number}, PO: {row.po_id}, Vendor: {row.vendor_id}, Status: {row.status}")

if __name__ == "__main__":
    asyncio.run(run())
