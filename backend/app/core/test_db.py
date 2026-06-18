import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

from dotenv import load_dotenv
import os

async def test_conn():
    load_dotenv(override=True)
    db_url = os.environ.get('DATABASE_URL')
    print(f"Attempting to connect to: {db_url}...")
    engine = create_async_engine(db_url)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            await conn.commit()
            print("\n=========================================")
            print("  SUCCESS: Database connection successful!")
            print("  The PostgreSQL database is up and running.")
            print("=========================================")
    except Exception as e:
        print("\n=========================================")
        print("  FAILURE: Could not connect to the database.")
        print("  Please make sure PostgreSQL is running and the credentials are correct.")
        print("=========================================")
        print(f"Error details: {e}")
        sys.exit(1)
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_conn())

