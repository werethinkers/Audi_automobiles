from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from .schemas import StationCreate, StationUpdate, StationResponse
from .service import (
    list_stations_service,
    create_station_service,
    get_station_service,
    update_station_service,
    delete_station_service,
    permanent_delete_station_service
)

router = APIRouter()


@router.get("/", response_model=List[StationResponse])
async def list_stations(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    return await list_stations_service(
        db=db,
        skip=skip,
        limit=limit,
        is_active=is_active
    )


@router.post("/", response_model=StationResponse, status_code=201)
async def create_station(
    data: StationCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    return await create_station_service(db, data)


@router.get("/{station_id}", response_model=StationResponse)
async def get_station(
    station_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    return await get_station_service(db, station_id)


@router.put("/{station_id}", response_model=StationResponse)
async def update_station(
    station_id: UUID,
    data: StationUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    return await update_station_service(db, station_id, data)


@router.delete("/{station_id}/permanent", status_code=204)
async def permanent_delete_station(
    station_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    await permanent_delete_station_service(db, station_id)


@router.delete("/{station_id}", status_code=204)
async def delete_station(
    station_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    await delete_station_service(db, station_id)