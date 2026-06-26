import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.environ['DATABASE_URL_SYNC'])
with engine.connect() as conn:
    res = conn.execute(text("SELECT portal_username FROM vendor_master WHERE name ILIKE '%VORA%'"))
    for row in res:
        print(f"Username: {row[0]}")
