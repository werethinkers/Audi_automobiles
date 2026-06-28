import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.rm_models import VendorMaster

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(VendorMaster).where(VendorMaster.name.ilike('%vora%')))
        vendors = res.scalars().all()
        for vendor in vendors:
            print(f"Name: {vendor.name}")
            print(f"Username: {vendor.portal_username}")
            print(f"Phone: {vendor.phone}")
            print(f"Portal Enabled: {vendor.portal_enabled}")
            print("---")

if __name__ == "__main__":
    asyncio.run(main())
