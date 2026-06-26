import requests
import uuid

BASE_URL = "http://127.0.0.1:8000"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.rm_models import VendorMaster
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL_SYNC")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def test_portal_flow():
    db = SessionLocal()
    vendor = db.query(VendorMaster).first()
    if not vendor:
        print("No vendors found in database. Creating a dummy vendor...")
        vendor = VendorMaster(name="Test Vendor ACME", email="acme@test.com", is_active=True)
        db.add(vendor)
        db.commit()
        db.refresh(vendor)
    
    vendor_id = str(vendor.vendor_id)
    print(f"Using vendor: {vendor.name} ({vendor_id})")
    db.close()

    print("\n--- Testing Admin Vendor Access Update ---")
    username = f"test_vendor_{uuid.uuid4().hex[:8]}"
    admin_payload = {
        "vendor_id": vendor_id,
        "portal_enabled": True,
        "portal_username": username,
        "portal_password": "securepassword123"
    }
    r = requests.post(f"{BASE_URL}/api/v1/admin/vendor-portal/vendor-access", json=admin_payload)
    if r.status_code != 200:
        print(f"Failed to update access: {r.status_code} - {r.text}")
        return
    print("Vendor portal access updated successfully:", r.json())

    print("\n--- Testing Vendor Login ---")
    login_payload = {
        "portal_username": username,
        "portal_password": "securepassword123"
    }
    r = requests.post(f"{BASE_URL}/api/v1/portal/login", json=login_payload)
    if r.status_code != 200:
        print(f"Login failed: {r.status_code} - {r.text}")
        return
    
    login_resp = r.json()
    token = login_resp['access_token']
    print(f"Login successful! Token: {token[:20]}...")

    print("\n--- Testing Vendor PO List ---")
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(f"{BASE_URL}/api/v1/portal/purchase-orders", headers=headers)
    if r.status_code != 200:
        print(f"Fetch POs failed: {r.status_code} - {r.text}")
        return
    print(f"PO List fetch successful! Found {len(r.json())} POs.")

    print("\n--- Testing Vendor Scorecard ---")
    r = requests.get(f"{BASE_URL}/api/v1/portal/scorecard", headers=headers)
    if r.status_code != 200:
        print(f"Fetch Scorecard failed: {r.status_code} - {r.text}")
        return
    print(f"Scorecard fetch successful! Found {len(r.json())} scorecards.")

    print("\n--- Testing Vendor Logout ---")
    r = requests.post(f"{BASE_URL}/api/v1/portal/logout", headers=headers)
    if r.status_code != 200:
        print(f"Logout failed: {r.status_code} - {r.text}")
        return
    print("Logout successful!")

if __name__ == "__main__":
    test_portal_flow()
