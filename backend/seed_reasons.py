import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def main():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    SessionLocal = sessionmaker(engine, class_=AsyncSession)
    async with SessionLocal() as db:
        await db.execute(text("""
            INSERT INTO rejection_reason_master (reason_code, description, is_active)
            VALUES 
            ('DEF_01', 'Defective Material', true),
            ('TOL_02', 'Out of Tolerance', true),
            ('COR_03', 'Corrosion/Rust', true)
            ON CONFLICT (reason_code) DO NOTHING;
        """))
        await db.commit()
        print("Reasons inserted")

asyncio.run(main())
