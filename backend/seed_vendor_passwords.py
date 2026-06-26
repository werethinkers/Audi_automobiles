import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from dotenv import load_dotenv
from passlib.context import CryptContext

load_dotenv()

from app.models.rm_models import RmMaster, RmPurchaseOrder # Need models to ensure tables load
from app.models.vendor_portal import VendorPortalLog
from app.core.database import Base

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def main():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    SessionLocal = sessionmaker(engine, class_=AsyncSession)
    
    async with SessionLocal() as db:
        # Import RmMaster dynamically or just execute RAW SQL to avoid model dependency issues
        from app.models.rm_models import RmVendorMaster
        
        result = await db.execute(select(RmVendorMaster))
        vendors = result.scalars().all()
        
        updated = 0
        for vendor in vendors:
            if not vendor.portal_password_hash:
                vendor.portal_enabled = True
                vendor.portal_username = vendor.mobile if vendor.mobile else f"vendor_{str(vendor.vendor_id)[:8]}"
                # Default password: password123
                vendor.portal_password_hash = pwd_context.hash("password123")
                updated += 1
                
        if updated > 0:
            await db.commit()
            print(f"Successfully seeded passwords and enabled portal access for {updated} vendors.")
            print("Default password is: password123")
        else:
            print("All vendors already have portal access configured.")

if __name__ == "__main__":
    asyncio.run(main())
