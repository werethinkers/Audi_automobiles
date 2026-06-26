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
        res = await db.execute(text("SELECT code, name FROM po_status_master"))
        rows = res.fetchall()
        for row in rows:
            print(f"Code: {row.code}, Name: {row.name}")

if __name__ == "__main__":
    asyncio.run(run())
