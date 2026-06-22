from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class StationCreate(BaseModel):
    station_code: str = Field(..., min_length=1, max_length=50)
    station_name: str = Field(..., min_length=1, max_length=255)
    station_description: Optional[str] = None
    sequence_no: Optional[int] = None
    requires_qa: Optional[bool] = True
    is_rework_station: Optional[bool] = False
    backflush_enabled: Optional[bool] = False
    standard_cycle_time_min: Optional[int] = None
    is_active: Optional[bool] = True
    custom_fields: dict = Field(default_factory=dict)


class StationUpdate(BaseModel):
    station_code: Optional[str] = None
    station_name: Optional[str] = None
    station_description: Optional[str] = None
    sequence_no: Optional[int] = None
    requires_qa: Optional[bool] = None
    is_rework_station: Optional[bool] = None
    backflush_enabled: Optional[bool] = None
    standard_cycle_time_min: Optional[int] = None
    is_active: Optional[bool] = None
    custom_fields: dict = Field(default_factory=dict)


class StationResponse(BaseModel):
    station_id: UUID
    station_code: str
    station_name: str
    station_description: Optional[str]
    sequence_no: Optional[int]
    requires_qa: bool
    is_rework_station: bool
    backflush_enabled: bool
    standard_cycle_time_min: Optional[int]
    is_active: bool
    custom_fields: dict = Field(default_factory=dict)
    created_at: datetime

    class Config:
        from_attributes = True