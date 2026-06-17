# app/modules/vendor/routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rm_models import VendorMaster
from .schemas import VendorCreate, VendorUpdate, VendorResponse
from uuid import UUID
from typing import List, Optional
 
router = APIRouter()
 
@router.get('/', response_model=List[VendorResponse])
async def list_vendors(
    skip: int = 0, limit: int = 100,
    is_active: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    stmt = select(VendorMaster)
    if is_active is not None and is_active.lower() not in ('null', 'none', ''):
        active_val = is_active.lower() in ('true', '1', 'yes')
        stmt = stmt.where(VendorMaster.is_active == active_val)
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())
 
@router.post('/', response_model=VendorResponse, status_code=201)
async def create_vendor(
    data: VendorCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    vendor = VendorMaster(**data.model_dump(exclude_none=True))
    db.add(vendor)
    await db.flush()
    await db.refresh(vendor)
    return vendor
 
@router.get('/{vendor_id}', response_model=VendorResponse)
async def get_vendor(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    vendor = await db.get(VendorMaster, vendor_id)
    if not vendor:
        raise HTTPException(404, 'Vendor not found')
    return vendor
 
@router.put('/{vendor_id}', response_model=VendorResponse)
async def update_vendor(
    vendor_id: UUID,
    data: VendorUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    vendor = await db.get(VendorMaster, vendor_id)
    if not vendor:
        raise HTTPException(404, 'Vendor not found')
    
    update_data = data.model_dump(exclude_none=True)
    for key, val in update_data.items():
        setattr(vendor, key, val)
        
    await db.flush()
    await db.refresh(vendor)
    return vendor
 
@router.delete('/{vendor_id}', status_code=204)
async def delete_vendor(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    vendor = await db.get(VendorMaster, vendor_id)
    if not vendor:
        raise HTTPException(404, 'Vendor not found')
    vendor.is_active = False
    await db.flush()
