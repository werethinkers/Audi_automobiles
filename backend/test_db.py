import asyncio
import uuid
from app.core.database import get_db
from app.models.rm_models import VendorMaster

async def main():
    async for db in get_db():
        print('db type:', type(db))
        vendor = await db.get(VendorMaster, uuid.uuid4())
        print('vendor type:', type(vendor))

asyncio.run(main())
