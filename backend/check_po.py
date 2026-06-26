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
        res = await db.execute(text("SELECT rm_purchase_order.po_number, po_status_master.name FROM rm_purchase_order LEFT JOIN po_status_master ON rm_purchase_order.status_id = po_status_master.id"))
        rows = res.fetchall()
        for row in rows:
            print(f"PO: {row[0]}, Status: {row[1]}")

if __name__ == "__main__":
    asyncio.run(run())
