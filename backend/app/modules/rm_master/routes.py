# app/modules/rm_master/routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rm_models import RmMaster, MaterialTypeMaster, ProcurementSourceMaster
from .schemas import RmMasterCreate, RmMasterUpdate, RmMasterResponse
from uuid import UUID
from typing import List, Optional
 
router = APIRouter()
 
@router.get('/material-types')
async def list_material_types(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MaterialTypeMaster).where(MaterialTypeMaster.is_active == True))
    return list(result.scalars().all())
 
@router.get('/procurement-sources')
async def list_procurement_sources(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProcurementSourceMaster).where(ProcurementSourceMaster.is_active == True))
    return list(result.scalars().all())
 
@router.get('/', response_model=List[RmMasterResponse])
async def list_rm(
    skip: int = 0, limit: Optional[int] = None,
    is_active: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    stmt = select(RmMaster)
    if is_active is not None and is_active.lower() not in ('null', 'none', ''):
        active_val = is_active.lower() in ('true', '1', 'yes')
        stmt = stmt.where(RmMaster.is_active == active_val)
    if skip > 0:
        stmt = stmt.offset(skip)
    if limit is not None:
        stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())

 
@router.post('/', response_model=RmMasterResponse, status_code=201)
async def create_rm(
    data: RmMasterCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    rm = RmMaster(**data.model_dump(exclude_none=True))
    db.add(rm)
    await db.flush()
    await db.refresh(rm)
    return rm
 
@router.get('/{rm_id}', response_model=RmMasterResponse)
async def get_rm(
    rm_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    rm = await db.get(RmMaster, rm_id)
    if not rm:
        raise HTTPException(404, 'RM not found')
    return rm
 
@router.put('/{rm_id}', response_model=RmMasterResponse)
async def update_rm(
    rm_id: UUID,
    data: RmMasterUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    rm = await db.get(RmMaster, rm_id)
    if not rm:
        raise HTTPException(404, 'RM not found')
    
    update_data = data.model_dump(exclude_none=True)
    for key, val in update_data.items():
        setattr(rm, key, val)
        
    await db.flush()
    await db.refresh(rm)
    return rm
 
@router.delete('/{rm_id}', status_code=204)
async def delete_rm(
    rm_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    rm = await db.get(RmMaster, rm_id)
    if not rm:
        raise HTTPException(404, 'RM not found')
    rm.is_active = False
    await db.flush()
