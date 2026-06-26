import os
import re

file_path = "app/modules/vendor_portal/routes.py"

with open(file_path, "r") as f:
    content = f.read()

new_routes = """
from app.models.vendor_portal import POTrackingLog, ASNLog, ASNDetail
from app.models.rm_models import RmPurchaseOrder
from sqlalchemy import update

class AcknowledgeRequest(BaseModel):
    notes: Optional[str] = None

@router.post("/purchase-orders/{po_id}/acknowledge")
async def acknowledge_po(
    po_id: uuid.UUID,
    payload: AcknowledgeRequest,
    vendor: dict = Depends(get_current_vendor),
    db: AsyncSession = Depends(get_db)
):
    # Verify PO belongs to vendor
    po = await db.get(RmPurchaseOrder, po_id)
    if not po or po.vendor_id != vendor["vendor_id"]:
        raise HTTPException(status_code=404, detail="PO not found")
        
    # Find ACKNOWLEDGED status ID
    status_res = await db.execute(text("SELECT id FROM po_status_master WHERE code = 'ACKNOWLEDGED' LIMIT 1"))
    ack_status_id = status_res.scalar_one_or_none()
    
    if ack_status_id:
        po.status_id = ack_status_id
        
    tracking = POTrackingLog(
        po_id=po_id,
        event_type='ACKNOWLEDGED',
        event_date=datetime.now(timezone.utc),
        notes=payload.notes,
        created_by=str(vendor["vendor_id"])
    )
    db.add(tracking)
    await db.commit()
    return {"message": "PO Acknowledged successfully"}

class ASNItemBase(BaseModel):
    po_detail_id: uuid.UUID
    shipped_qty: float
    batch_number: str

class ASNCreate(BaseModel):
    po_id: uuid.UUID
    expected_date: datetime
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    arrival_window: Optional[str] = None
    items: List[ASNItemBase]

@router.post("/asns")
async def create_asn(
    payload: ASNCreate,
    vendor: dict = Depends(get_current_vendor),
    db: AsyncSession = Depends(get_db)
):
    # Find IN_TRANSIT status ID
    status_res = await db.execute(text("SELECT id FROM po_status_master WHERE code = 'IN_TRANSIT' LIMIT 1"))
    transit_status_id = status_res.scalar_one_or_none()
    
    asn_number = f"ASN-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    asn = ASNLog(
        asn_number=asn_number,
        vendor_id=vendor["vendor_id"],
        po_id=payload.po_id,
        expected_date=payload.expected_date,
        vehicle_number=payload.vehicle_number,
        driver_name=payload.driver_name,
        arrival_window=payload.arrival_window,
        status='GENERATED'
    )
    db.add(asn)
    await db.flush()
    
    for item in payload.items:
        detail = ASNDetail(
            asn_id=asn.asn_id,
            po_detail_id=item.po_detail_id,
            shipped_qty=item.shipped_qty,
            batch_number=item.batch_number
        )
        db.add(detail)
        
    # Update PO status
    if transit_status_id:
        await db.execute(update(RmPurchaseOrder).where(RmPurchaseOrder.po_id == payload.po_id).values(status_id=transit_status_id))
        
    await db.commit()
    return {"message": "ASN Created successfully", "asn_id": asn.asn_id, "asn_number": asn_number}
"""

with open(file_path, "w") as f:
    f.write(content + "\n" + new_routes)
