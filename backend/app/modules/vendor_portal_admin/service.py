from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.rm_models import VendorMaster
from app.models.vendor_portal import VendorPortalAdminActionLog
from app.modules.vendor_portal_admin.schemas import VendorPortalAccessRequest, VendorPortalAccessResponse
from app.core.security import hash_password
import uuid

async def update_vendor_portal_access(db: AsyncSession, admin_id: uuid.UUID, req: VendorPortalAccessRequest, ip: str = None) -> VendorPortalAccessResponse:
    vendor = await db.get(VendorMaster, req.vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    vendor.portal_enabled = req.portal_enabled
    if req.portal_username:
        # Check uniqueness
        from sqlalchemy import select
        existing_result = await db.execute(select(VendorMaster).where(VendorMaster.portal_username == req.portal_username, VendorMaster.vendor_id != vendor.vendor_id))
        existing = existing_result.scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        vendor.portal_username = req.portal_username
        
    if req.portal_password:
        vendor.portal_password_hash = hash_password(req.portal_password)

    # Log action
    log = VendorPortalAdminActionLog(
        admin_user_id=admin_id,
        vendor_id=vendor.vendor_id,
        action_type="UPDATE_PORTAL_ACCESS",
        action_details={"enabled": req.portal_enabled, "username": req.portal_username},
        ip_address=ip
    )
    db.add(log)
    await db.commit()
    await db.refresh(vendor)

    return VendorPortalAccessResponse(
        vendor_id=vendor.vendor_id,
        portal_enabled=vendor.portal_enabled,
        portal_username=vendor.portal_username
    )
