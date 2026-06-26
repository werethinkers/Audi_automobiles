import sys
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

db_url = os.environ.get("DATABASE_URL_SYNC")
if not db_url:
    print("No DATABASE_URL_SYNC found")
    sys.exit(1)

engine = create_engine(db_url)
with engine.connect() as conn:
    result = conn.execute(text("SELECT COUNT(*) FROM vendor_master")).scalar()
    print(f"Total Vendors in DB: {result}")
