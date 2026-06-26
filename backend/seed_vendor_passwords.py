import os
import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

from app.models.rm_models import VendorMaster
from app.core.security import hash_password

load_dotenv()
db_url = os.environ.get("DATABASE_URL_SYNC")
engine = create_engine(db_url)
SessionLocal = sessionmaker(bind=engine)

def slugify(text: str) -> str:
    # Lowercase, remove special chars except spaces, replace spaces with underscores
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    text = re.sub(r'\s+', '_', text.strip())
    return text

def run_seed():
    db = SessionLocal()
    vendors = db.query(VendorMaster).all()
    
    updated_count = 0
    for v in vendors:
        # Generate username
        base_username = slugify(v.name) if v.name else f"vendor_{v.vendor_id.hex[:8]}"
        username = base_username
        
        # Ensure unique username
        counter = 1
        while db.query(VendorMaster).filter(VendorMaster.portal_username == username, VendorMaster.vendor_id != v.vendor_id).first():
            username = f"{base_username}_{counter}"
            counter += 1
            
        password = f"{username}123"
        v.portal_enabled = True
        v.portal_username = username
        v.portal_password_hash = hash_password(password)
        
        updated_count += 1
        if updated_count <= 5:
            print(f"Vendor: {v.name} | Username: {username} | Password: {password}")

    db.commit()
    print(f"Successfully updated {updated_count} vendors with portal credentials.")
    db.close()

if __name__ == "__main__":
    run_seed()
