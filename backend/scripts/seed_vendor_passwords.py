import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from dotenv import load_dotenv
import bcrypt

load_dotenv()

async def main():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    SessionLocal = sessionmaker(engine, class_=AsyncSession)
    
    async with SessionLocal() as db:
        from app.models.rm_models import VendorMaster
        
        result = await db.execute(select(VendorMaster))
        vendors = result.scalars().all()
        
        updated = 0
        for vendor in vendors:
            vendor.portal_enabled = True
            
            # Ensure they have a username
            if not vendor.portal_username:
                vendor.portal_username = vendor.phone if vendor.phone else f"vendor_{str(vendor.vendor_id)[:8]}"
                
            # Set password to username + "123" (truncate to 72 bytes for bcrypt)
            new_password = f"{vendor.portal_username}123"[:72]
            
            # Hash directly with bcrypt instead of passlib to avoid passlib bcrypt 4.x bugs on Windows
            salt = bcrypt.gensalt()
            hashed_bytes = bcrypt.hashpw(new_password.encode('utf-8'), salt)
            # Store the hash prefix for passlib compatibility ($2b$)
            vendor.portal_password_hash = hashed_bytes.decode('utf-8')
            updated += 1
            
        if updated > 0:
            await db.commit()
            print(f"Successfully updated passwords and enabled portal access for {updated} vendors.")
            print("Format: Username = <username>, Password = <username>123")
        else:
            print("No vendors found to update.")

if __name__ == "__main__":
    asyncio.run(main())
