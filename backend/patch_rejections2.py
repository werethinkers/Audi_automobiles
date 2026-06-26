import os
import re

file_path = "app/modules/vendor_portal/routes.py"

with open(file_path, "r") as f:
    content = f.read()

# remove old RejectionResponse and NCRResponse blocks if they exist
content = re.sub(r'class RejectionResponse.*?return ncrs', '', content, flags=re.DOTALL)

new_routes = """
from app.models.vendor_portal import RejectionLog, NCRLog
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
from sqlalchemy import select

class RejectionResponse(BaseModel):
    rejection_id: uuid.UUID
    rln: str
    grn_id: uuid.UUID
    vendor_id: uuid.UUID
    total_qty: float
    reason_code: Optional[str] = None
    created_at: datetime
    status: str
    
class NCRResponse(BaseModel):
    ncr_id: uuid.UUID
    ncr_number: str
    vendor_id: uuid.UUID
    rejection_id: Optional[uuid.UUID]
    defect_description: Optional[str] = None
    car_due: Optional[datetime] = None
    status: str
    created_at: datetime

@router.get("/rejections", response_model=List[RejectionResponse])
async def get_rejections(vendor: dict = Depends(get_current_vendor), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RejectionLog)
        .where(RejectionLog.vendor_id == vendor["vendor_id"])
        .order_by(RejectionLog.created_at.desc())
    )
    return list(result.scalars().all())

@router.get("/ncrs", response_model=List[NCRResponse])
async def get_ncrs(vendor: dict = Depends(get_current_vendor), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(NCRLog)
        .where(NCRLog.vendor_id == vendor["vendor_id"])
        .order_by(NCRLog.created_at.desc())
    )
    return list(result.scalars().all())
"""

with open(file_path, "w") as f:
    f.write(content + "\n" + new_routes)
