import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from dotenv import load_dotenv

load_dotenv()
from app.models.rm_models import RmReceivingLog

async def main():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    SessionLocal = sessionmaker(engine, class_=AsyncSession)
    async with SessionLocal() as db:
        res = await db.execute(select(RmReceivingLog).limit(1))
        print("GRNs:", list(res.scalars().all()))

asyncio.run(main())
