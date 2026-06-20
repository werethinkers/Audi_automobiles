from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rm_models import StationMaster
from .schemas import StationCreate, StationUpdate, StationResponse

router = APIRouter()


@router.get('/', response_model=List[StationResponse])
async def list_stations(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    stmt = select(StationMaster)

    if is_active is not None and is_active.lower() not in ('null', 'none', ''):
        active_val = is_active.lower() in ('true', '1', 'yes')
        stmt = stmt.where(StationMaster.is_active == active_val)

    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post('/', response_model=StationResponse, status_code=201)
async def create_station(
    data: StationCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    station = StationMaster(**data.model_dump(exclude_none=True))

    db.add(station)

    await db.flush()
    await db.refresh(station)
    
    return station


@router.get('/{station_id}', response_model=StationResponse)
async def get_station(
    station_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    station = await db.get(StationMaster, station_id)

    if not station:
        raise HTTPException(404, 'Station not found')

    return station


@router.put('/{station_id}', response_model=StationResponse)
async def update_station(
    station_id: UUID,
    data: StationUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    station = await db.get(StationMaster, station_id)

    if not station:
        raise HTTPException(404, 'Station not found')

    update_data = data.model_dump(exclude_none=True)

    for key, value in update_data.items():
        setattr(station, key, value)

    await db.flush()
    await db.refresh(station)

    return station


@router.delete('/{station_id}', status_code=204)
async def delete_station(
    station_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    station = await db.get(StationMaster, station_id)

    if not station:
        raise HTTPException(404, 'Station not found')

    station.is_active = False

    await db.flush()