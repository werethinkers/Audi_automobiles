# app/modules/vendor/routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rm_models import VendorMaster, RmMaster, RmVendorMapping
from .schemas import VendorCreate, VendorUpdate, VendorResponse, VendorRmResponse, VendorRmAdd
from uuid import UUID, uuid4
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

@router.get('/{vendor_id}/materials', response_model=List[VendorRmResponse])
async def get_vendor_materials(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    vendor = await db.get(VendorMaster, vendor_id)
    if not vendor:
        raise HTTPException(404, 'Vendor not found')
        
    stmt = (
        select(
            RmMaster.rm_id,
            RmMaster.name,
            RmMaster.part_no,
            RmMaster.unit_of_measurement,
            RmVendorMapping.standard_cost
        )
        .select_from(RmVendorMapping)
        .join(RmMaster, RmVendorMapping.rm_id == RmMaster.rm_id)
        .where(
            RmVendorMapping.vendor_id == vendor_id,
            RmVendorMapping.is_active == True,
            RmMaster.is_active == True
        )
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {
            "rm_id": row.rm_id,
            "name": row.name,
            "part_no": row.part_no,
            "unit_of_measurement": row.unit_of_measurement,
            "standard_cost": float(row.standard_cost) if row.standard_cost is not None else None
        }
        for row in rows
    ]

@router.post('/{vendor_id}/materials', response_model=VendorRmResponse)
async def add_vendor_material(
    vendor_id: UUID,
    data: VendorRmAdd,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    vendor = await db.get(VendorMaster, vendor_id)
    if not vendor:
        raise HTTPException(404, 'Vendor not found')
        
    rm = await db.get(RmMaster, data.rm_id)
    if not rm:
        raise HTTPException(404, 'Raw Material not found')

    # Check if mapping already exists
    existing = await db.execute(
        select(RmVendorMapping).where(
            RmVendorMapping.vendor_id == vendor_id,
            RmVendorMapping.rm_id == data.rm_id
        )
    )
    mapping = existing.scalars().first()
    
    if mapping:
        # Update existing
        mapping.standard_cost = data.standard_cost
        mapping.is_active = True
    else:
        # Create new
        mapping = RmVendorMapping(
            mapping_id=uuid4(),
            vendor_id=vendor_id,
            rm_id=data.rm_id,
            standard_cost=data.standard_cost,
            is_active=True
        )
        db.add(mapping)
        
    await db.commit()
    
    return {
        "rm_id": rm.rm_id,
        "name": rm.name,
        "part_no": rm.part_no,
        "unit_of_measurement": rm.unit_of_measurement,
        "standard_cost": float(mapping.standard_cost) if mapping.standard_cost is not None else None
    }
