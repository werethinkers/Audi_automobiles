import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text, update

from app.core.database import get_db
from app.core.security import decode_token
from app.models.rm_models import RmPurchaseOrder, RmPoDetail, RmReceivingLog, GrnDetail, PoStatusMaster, RmMaster
from app.models.vendor_portal import VendorPortalLog, VendorScorecard, RejectionLog, ASNLog, ASNDetail, POTrackingLog, NCRLog
from app.modules.vendor_portal.schemas import VendorLoginRequest, VendorLoginResponse, POListResponse, ScorecardResponse, PODetailResponse, ASNSubmitRequest, ASNResponse, ASNListResponse
from app.modules.vendor_portal.service import authenticate_vendor, logout_vendor, log_vendor_action

router = APIRouter()

async def get_current_vendor(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = auth_header.split(" ")[1]
    payload = decode_token(token)
    
    if payload.get("sub_type") != "vendor":
        raise HTTPException(status_code=403, detail="Not authorized as a vendor")
        
    session_id = payload.get("session_id")
    vendor_id = payload.get("sub")
    
    session = await db.get(VendorPortalLog, session_id)
    if not session or session.invalidated_at is not None or session.expires_at.replace(tzinfo=None) < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Session expired or invalid")
        
    return {"vendor_id": uuid.UUID(vendor_id), "session_id": uuid.UUID(session_id)}

@router.post("/login", response_model=VendorLoginResponse)
async def login(req: VendorLoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    return await authenticate_vendor(db, req, request.client.host, request.headers.get("user-agent", ""))

@router.post("/logout")
async def logout(vendor: dict = Depends(get_current_vendor), db: AsyncSession = Depends(get_db)):
    await logout_vendor(db, vendor["session_id"])
    return {"message": "Logged out successfully"}

@router.get("/purchase-orders", response_model=list[POListResponse])
async def list_purchase_orders(vendor: dict = Depends(get_current_vendor), db: AsyncSession = Depends(get_db)):
    await log_vendor_action(db, vendor["vendor_id"], "PO_LIST_VIEW")
    
    result = await db.execute(
        select(RmPurchaseOrder, PoStatusMaster.name.label('status_name'))
        .join(PoStatusMaster, RmPurchaseOrder.status_id == PoStatusMaster.id)
        .where(RmPurchaseOrder.vendor_id == vendor["vendor_id"])
        .where(RmPurchaseOrder.status_id != None)
        .order_by(RmPurchaseOrder.created_at.desc())
    )
    rows = result.all()
    
    return [
        {
            "po_id": row.RmPurchaseOrder.po_id,
            "po_number": row.RmPurchaseOrder.po_number,
            "order_date": row.RmPurchaseOrder.order_date,
            "expected_delivery_date": row.RmPurchaseOrder.expected_delivery_date,
            "total_amount": row.RmPurchaseOrder.total_amount,
            "status": row.status_name
        } for row in rows
    ]

import calendar
from datetime import date

@router.get("/scorecard", response_model=list[ScorecardResponse])
async def view_scorecard(vendor: dict = Depends(get_current_vendor), db: AsyncSession = Depends(get_db)):
    from app.modules.vendor_portal.service import get_live_scorecard
    await log_vendor_action(db, vendor["vendor_id"], "SCORECARD_VIEW")
    
    today = date.today()
    start_date = date(today.year, today.month, 1)
    last_day = calendar.monthrange(today.year, today.month)[1]
    end_date = date(today.year, today.month, last_day)
    
    scorecard = await get_live_scorecard(db, vendor["vendor_id"], start_date, end_date)
    return [scorecard]

@router.get("/purchase-orders/{po_id}", response_model=PODetailResponse)
async def get_po_details(po_id: uuid.UUID, vendor: dict = Depends(get_current_vendor), db: AsyncSession = Depends(get_db)):
    po_result = await db.execute(
        select(RmPurchaseOrder, PoStatusMaster.code.label('status_code'))
        .outerjoin(PoStatusMaster, RmPurchaseOrder.status_id == PoStatusMaster.id)
        .where(RmPurchaseOrder.po_id == po_id)
        .where(RmPurchaseOrder.vendor_id == vendor["vendor_id"])
    )
    po_row = po_result.first()
    if not po_row:
        raise HTTPException(status_code=404, detail="PO not found")
        
    po = po_row.RmPurchaseOrder
    status_code = po_row.status_code or "OPEN"

    details_result = await db.execute(
        select(RmPoDetail, RmMaster)
        .join(RmMaster, RmPoDetail.rm_id == RmMaster.rm_id)
        .where(RmPoDetail.po_id == po_id)
    )
    
    lines = []
    for detail, rm in details_result.all():
        lines.append({
            "po_detail_id": detail.po_detail_id,
            "part_no": rm.part_no,
            "name": rm.name,
            "unit_of_measurement": rm.unit_of_measurement,
            "order_qty": detail.order_qty,
            "received_qty": detail.received_qty,
            "unit_price": detail.unit_price,
            "gst_percent": detail.gst_percent,
            "line_amount": detail.line_amount,
            "line_status": detail.line_status
        })
        
    return {
        "po_id": po.po_id,
        "po_number": po.po_number,
        "order_date": po.order_date,
        "expected_delivery_date": po.expected_delivery_date,
        "total_amount": po.total_amount,
        "notes": po.notes,
        "status": status_code,
        "details": lines
    }

@router.get("/asns", response_model=list[ASNListResponse])
async def list_asns(vendor: dict = Depends(get_current_vendor), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ASNLog, RmPurchaseOrder.po_number)
        .join(RmPurchaseOrder, ASNLog.po_id == RmPurchaseOrder.po_id)
        .where(ASNLog.vendor_id == vendor["vendor_id"])
        .order_by(ASNLog.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "asn_id": row.ASNLog.asn_id,
            "asn_number": row.ASNLog.asn_number,
            "po_id": row.ASNLog.po_id,
            "po_number": row.po_number,
            "expected_date": row.ASNLog.expected_date,
            "delivery_mode": row.ASNLog.delivery_mode,
            "status": row.ASNLog.status
        } for row in rows
    ]

@router.post("/asns", response_model=ASNResponse)
async def submit_asn(req: ASNSubmitRequest, vendor: dict = Depends(get_current_vendor), db: AsyncSession = Depends(get_db)):
    from app.modules.vendor_portal.service import generate_asn_number
    
    po_res = await db.execute(select(RmPurchaseOrder).where(RmPurchaseOrder.po_id == req.po_id, RmPurchaseOrder.vendor_id == vendor["vendor_id"]))
    po = po_res.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found or unauthorized")
        
    existing_asns_res = await db.execute(select(ASNLog).where(ASNLog.po_id == req.po_id, ASNLog.status == 'SUBMITTED'))
    existing_asns = existing_asns_res.scalars().all()
    
    is_recreation = False
    for old_asn in existing_asns:
        old_asn.status = 'REPLACED_DUE_TO_DELAY'
        is_recreation = True

    status_code_to_find = 'UPDATED_ASN_SHIPPED' if is_recreation else 'ASN_SHIPPED'
    status_res = await db.execute(select(PoStatusMaster).where(PoStatusMaster.code == status_code_to_find))
    new_status = status_res.scalar_one_or_none()
    
    if new_status:
        await db.execute(update(RmPurchaseOrder).where(RmPurchaseOrder.po_id == po.po_id).values(status_id=new_status.id))
        
    asn_number = await generate_asn_number(db)
    
    asn_log = ASNLog(
        asn_number=asn_number,
        vendor_id=vendor["vendor_id"],
        po_id=req.po_id,
        expected_date=req.expected_date,
        delivery_mode=req.delivery_mode,
        courier_name=req.courier_name,
        tracking_number=req.tracking_number,
        vehicle_number=req.vehicle_number,
        driver_name=req.driver_name,
        arrival_window=req.arrival_window,
        status="SUBMITTED"
    )
    db.add(asn_log)
    await db.flush()
    
    for line in req.lines:
        detail = ASNDetail(
            asn_id=asn_log.asn_id,
            po_detail_id=line.po_detail_id,
            qty_shipped=line.qty_shipped,
            vendor_batch_ref=line.vendor_batch_ref
        )
        db.add(detail)
        
    await db.commit()
    await log_vendor_action(db, vendor["vendor_id"], "ASN_CREATED", "ASNLog", asn_log.asn_id)
    
    return {"message": "ASN successfully created!", "asn_id": asn_log.asn_id}

from pydantic import BaseModel
from typing import List, Optional

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

class AcknowledgeRequest(BaseModel):
    notes: Optional[str] = None

@router.post("/purchase-orders/{po_id}/acknowledge")
async def acknowledge_po(
    po_id: uuid.UUID,
    payload: AcknowledgeRequest,
    vendor: dict = Depends(get_current_vendor),
    db: AsyncSession = Depends(get_db)
):
    po = await db.get(RmPurchaseOrder, po_id)
    if not po or po.vendor_id != vendor["vendor_id"]:
        raise HTTPException(status_code=404, detail="PO not found")
        
    status_res = await db.execute(text("SELECT id FROM po_status_master WHERE code = 'ACKNOWLEDGED' LIMIT 1"))
    ack_status_id = status_res.scalar_one_or_none()
    
    if ack_status_id:
        po.status_id = ack_status_id
        
    tracking = POTrackingLog(
        po_id=po_id,
        event_type='ACKNOWLEDGED',
        event_date=datetime.utcnow(),
        notes=payload.notes,
        created_by=str(vendor["vendor_id"])
    )
    db.add(tracking)
    await db.commit()
    return {"message": "PO Acknowledged successfully"}
