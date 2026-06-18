import asyncio, os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

async def check():
    load_dotenv(override=True)
    engine = create_async_engine(os.environ.get('DATABASE_URL'))
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            WHERE t.relname = 'store_master' AND c.conname = 'store_master_store_type_check';
        """))
        print('CONSTRAINT:', res.scalar())
        
        # While we're here, let's fix the invalid store types in seed_data if they don't match
        # Let's get the valid ones:
        
check_coro = check()
asyncio.run(check_coro)
