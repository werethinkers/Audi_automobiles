from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from app.core.database import get_db
from app.core.security import decode_token
from app.modules.vendor_portal_admin.schemas import VendorPortalAccessRequest, VendorPortalAccessResponse
from app.modules.vendor_portal_admin.service import update_vendor_portal_access

router = APIRouter()

async def get_current_admin(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    # In a full implementation, this should extract token, decode it, and ensure user is an internal staff (role=ADMIN/PURCHASE_MANAGER)
    # For now we'll simulate a valid admin context if a token is present, since staff auth is a parallel feature.
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        # Since staff login endpoints aren't fully integrated yet, we fallback to a dummy ID for testing Phase 1.
        return {"admin_id": uuid.uuid4()}
    
    token = auth_header.split(" ")[1]
    try:
        payload = decode_token(token)
        return {"admin_id": uuid.UUID(payload.get("sub", str(uuid.uuid4())))}
    except:
        return {"admin_id": uuid.uuid4()}

@router.post("/vendor-access", response_model=VendorPortalAccessResponse)
async def manage_vendor_access(req: VendorPortalAccessRequest, request: Request, admin: dict = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    return await update_vendor_portal_access(db, admin["admin_id"], req, request.client.host)
