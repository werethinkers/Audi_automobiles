import os

file_path = "app/modules/vendor_portal/routes.py"

with open(file_path, "r") as f:
    content = f.read()

new_routes = """
from app.models.vendor_portal import RejectionLog, NCRLog
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class RejectionResponse(BaseModel):
    rejection_id: uuid.UUID
    rejection_number: str
    grn_id: uuid.UUID
    vendor_id: uuid.UUID
    po_detail_id: uuid.UUID
    rejected_qty: float
    rejection_reason: str
    rejection_date: datetime
    status: str
    part_name: Optional[str] = None
    
class NCRResponse(BaseModel):
    ncr_id: uuid.UUID
    ncr_number: str
    vendor_id: uuid.UUID
    related_rejection_id: Optional[uuid.UUID]
    severity: str
    description: str
    required_action: str
    status: str
    created_at: datetime
    updated_at: datetime

@router.get("/rejections", response_model=List[RejectionResponse])
async def get_rejections(vendor: dict = Depends(get_current_vendor), db: AsyncSession = Depends(get_db)):
    # Join with RmPoDetail and RmMaster to get the part name
    result = await db.execute(
        select(RejectionLog, RmMaster.name.label("part_name"))
        .outerjoin(RmPoDetail, RejectionLog.po_detail_id == RmPoDetail.po_detail_id)
        .outerjoin(RmMaster, RmPoDetail.rm_id == RmMaster.rm_id)
        .where(RejectionLog.vendor_id == vendor["vendor_id"])
        .order_by(RejectionLog.rejection_date.desc())
    )
    
    rows = result.all()
    rejections = []
    for rej, part_name in rows:
        rej_dict = {
            "rejection_id": rej.rejection_id,
            "rejection_number": rej.rejection_number,
            "grn_id": rej.grn_id,
            "vendor_id": rej.vendor_id,
            "po_detail_id": rej.po_detail_id,
            "rejected_qty": rej.rejected_qty,
            "rejection_reason": rej.rejection_reason,
            "rejection_date": rej.rejection_date,
            "status": rej.status,
            "part_name": part_name
        }
        rejections.append(rej_dict)
    return rejections

@router.get("/ncrs", response_model=List[NCRResponse])
async def get_ncrs(vendor: dict = Depends(get_current_vendor), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(NCRLog)
        .where(NCRLog.vendor_id == vendor["vendor_id"])
        .order_by(NCRLog.created_at.desc())
    )
    ncrs = result.scalars().all()
    return ncrs
"""

if "get_rejections" not in content:
    with open(file_path, "a") as f:
        f.write("\n" + new_routes)
    print("Routes appended!")
else:
    print("Routes already exist!")
