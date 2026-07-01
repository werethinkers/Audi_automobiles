import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

DB_URL = 'postgresql+asyncpg://erp_user:erp_2026@localhost:5432/erp_db'

async def check():
    engine = create_async_engine(DB_URL)
    async with AsyncSession(engine) as db:
        r1 = await db.execute(text('SELECT COUNT(*) FROM rm_vendor_mapping'))
        print('rm_vendor_mapping rows:', r1.scalar())

        r2 = await db.execute(text('SELECT COUNT(*) FROM rm_master WHERE is_active=true'))
        print('active rm_master rows:', r2.scalar())

        r3 = await db.execute(text(
            'SELECT v.name, COUNT(m.rm_id) '
            'FROM vendor_master v '
            'LEFT JOIN rm_vendor_mapping m ON v.vendor_id=m.vendor_id '
            'GROUP BY v.name ORDER BY v.name LIMIT 10'
        ))
        print('vendor -> RM mapping count:')
        for row in r3:
            print(' ', row[0], '->', row[1], 'RMs')

asyncio.run(check())
