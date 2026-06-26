from uuid import UUID
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rm_models import StationMaster
from .schemas import StationCreate, StationUpdate


async def list_stations_service(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[str] = None
):
    stmt = select(StationMaster)

    if is_active is not None and is_active.lower() not in ("null", "none", ""):
        active_val = is_active.lower() in ("true", "1", "yes")
        stmt = stmt.where(StationMaster.is_active == active_val)

    stmt = stmt.offset(skip).limit(limit)

    result = await db.execute(stmt)

    return list(result.scalars().all())


async def create_station_service(
    db: AsyncSession,
    data: StationCreate
):
    stmt = select(StationMaster).where(
        StationMaster.station_code == data.station_code
    )

    result = await db.execute(stmt)
    existing_station = result.scalar_one_or_none()

    if existing_station:
        raise HTTPException(
            status_code=400,
            detail="Station code already exists"
        )

    station = StationMaster(
        **data.model_dump(exclude_none=True)
    )

    db.add(station)

    await db.commit()
    await db.refresh(station)

    return station


async def get_station_service(
    db: AsyncSession,
    station_id: UUID
):
    station = await db.get(StationMaster, station_id)

    if not station:
        raise HTTPException(
            status_code=404,
            detail="Station not found"
        )

    return station


async def update_station_service(
    db: AsyncSession,
    station_id: UUID,
    data: StationUpdate
):
    station = await db.get(StationMaster, station_id)

    if not station:
        raise HTTPException(
            status_code=404,
            detail="Station not found"
        )

    update_data = data.model_dump(exclude_none=True)

    if "station_code" in update_data:
        stmt = select(StationMaster).where(
            StationMaster.station_code == update_data["station_code"],
            StationMaster.station_id != station_id
        )

        result = await db.execute(stmt)

        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail="Station code already exists"
            )

    for key, value in update_data.items():
        setattr(station, key, value)

    await db.commit()
    await db.refresh(station)

    return station


async def delete_station_service(
    db: AsyncSession,
    station_id: UUID
):
    station = await db.get(StationMaster, station_id)

    if not station:
        raise HTTPException(
            status_code=404,
            detail="Station not found"
        )

    station.is_active = False

    await db.commit()


async def permanent_delete_station_service(
    db: AsyncSession,
    station_id: UUID
):
    station = await db.get(StationMaster, station_id)

    if not station:
        raise HTTPException(
            status_code=404,
            detail="Station not found"
        )

    await db.delete(station)
    await db.commit()