# app/modules/store/routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rm_models import StoreMaster
from .schemas import StoreCreate, StoreUpdate, StoreResponse
from uuid import UUID
from typing import List, Optional
 
router = APIRouter()
 
@router.get('/', response_model=List[StoreResponse])
async def list_stores(
    skip: int = 0, limit: int = 100,
    is_active: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    stmt = select(StoreMaster)
    if is_active is not None and is_active.lower() not in ('null', 'none', ''):
        active_val = is_active.lower() in ('true', '1', 'yes')
        stmt = stmt.where(StoreMaster.is_active == active_val)
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())
 
@router.post('/', response_model=StoreResponse, status_code=201)
async def create_store(
    data: StoreCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    store = StoreMaster(**data.model_dump(exclude_none=True))
    db.add(store)
    await db.flush()
    await db.refresh(store)
    return store
 
@router.get('/{store_id}', response_model=StoreResponse)
async def get_store(
    store_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    store = await db.get(StoreMaster, store_id)
    if not store:
        raise HTTPException(404, 'Store not found')
    return store
 
@router.put('/{store_id}', response_model=StoreResponse)
async def update_store(
    store_id: UUID,
    data: StoreUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    store = await db.get(StoreMaster, store_id)
    if not store:
        raise HTTPException(404, 'Store not found')
    
    update_data = data.model_dump(exclude_none=True)
    for key, val in update_data.items():
        setattr(store, key, val)
        
    await db.flush()
    await db.refresh(store)
    return store
 
@router.delete('/{store_id}', status_code=204)
async def delete_store(
    store_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    store = await db.get(StoreMaster, store_id)
    if not store:
        raise HTTPException(404, 'Store not found')
    store.is_active = False
    await db.flush()
