import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import AsyncSessionLocal
from app.models.rm_models import RmMaster
from app.models.bom_models import ProductMaster
from sqlalchemy.future import select

async def check():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(RmMaster))
        print(f"RmMaster count: {len(res.scalars().all())}")
        
        pres = await session.execute(select(ProductMaster))
        print(f"ProductMaster count: {len(pres.scalars().all())}")

if __name__ == "__main__":
    asyncio.run(check())
