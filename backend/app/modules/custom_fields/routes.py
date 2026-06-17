
# app/modules/custom_fields/routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rm_models import EntityCustomField, EntityCustomFieldValue
from .schemas import (
    CustomFieldCreate, CustomFieldUpdate, CustomFieldResponse,
    CustomFieldValueBulkSave, CustomFieldValueResponse
)
from uuid import UUID
from typing import List, Optional
 
router = APIRouter()
 
# ── CUSTOM FIELD DEFINITION ENDPOINTS ──────────────────
@router.get('/fields', response_model=List[CustomFieldResponse])
async def list_custom_fields(
    entity_type: Optional[str] = None,
    is_active: Optional[str] = 'true',
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    stmt = select(EntityCustomField)
    if entity_type:
        stmt = stmt.where(EntityCustomField.entity_type == entity_type)
    if is_active is not None and is_active.lower() not in ('null', 'none', ''):
        active_val = is_active.lower() in ('true', '1', 'yes')
        stmt = stmt.where(EntityCustomField.is_active == active_val)
    stmt = stmt.order_by(EntityCustomField.sort_order.asc())
    result = await db.execute(stmt)
    return list(result.scalars().all())
 
@router.post('/fields', response_model=CustomFieldResponse, status_code=201)
async def create_custom_field(
    data: CustomFieldCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    stmt = select(EntityCustomField).where(
        EntityCustomField.entity_type == data.entity_type,
        EntityCustomField.field_key == data.field_key
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(400, f"Field key '{data.field_key}' already exists for entity '{data.entity_type}'")
        
    cf = EntityCustomField(**data.model_dump(exclude_none=True))
    db.add(cf)
    await db.flush()
    await db.refresh(cf)
    return cf
 
@router.put('/fields/{field_id}', response_model=CustomFieldResponse)
async def update_custom_field(
    field_id: UUID,
    data: CustomFieldUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    cf = await db.get(EntityCustomField, field_id)
    if not cf:
        raise HTTPException(404, 'Custom field definition not found')
        
    update_data = data.model_dump(exclude_none=True)
    for key, val in update_data.items():
        setattr(cf, key, val)
        
    await db.flush()
    await db.refresh(cf)
    return cf
 
@router.delete('/fields/{field_id}', status_code=204)
async def delete_custom_field(
    field_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    cf = await db.get(EntityCustomField, field_id)
    if not cf:
        raise HTTPException(404, 'Custom field definition not found')
    cf.is_active = False
    await db.flush()
 
# ── CUSTOM FIELD VALUES ENDPOINTS ──────────────────────
@router.get('/values/{entity_type}/{entity_id}', response_model=List[CustomFieldValueResponse])
async def get_custom_field_values(
    entity_type: str,
    entity_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    stmt = select(EntityCustomFieldValue).where(
        EntityCustomFieldValue.entity_type == entity_type,
        EntityCustomFieldValue.entity_id == entity_id
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
 
@router.post('/values', response_model=List[CustomFieldValueResponse])
async def save_custom_field_values(
    data: CustomFieldValueBulkSave,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    saved_values = []
    
    for val in data.values:
        stmt = select(EntityCustomFieldValue).where(
            EntityCustomFieldValue.field_id == val.field_id,
            EntityCustomFieldValue.entity_type == data.entity_type,
            EntityCustomFieldValue.entity_id == data.entity_id
        )
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if existing:
            existing.field_value = val.field_value
            saved_values.append(existing)
        else:
            new_val = EntityCustomFieldValue(
                field_id=val.field_id,
                entity_type=data.entity_type,
                entity_id=data.entity_id,
                field_value=val.field_value
            )
            db.add(new_val)
            saved_values.append(new_val)
            
    await db.flush()
    return saved_values
