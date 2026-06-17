# app/modules/custom_fields/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
 
class CustomFieldCreate(BaseModel):
    entity_type: str
    field_key: str
    field_label: str
    field_type: str  # text, number, date, dropdown
    dropdown_options: Optional[List[str]] = None
    is_required: Optional[bool] = False
    is_visible_in_list: Optional[bool] = False
    sort_order: Optional[int] = 0
 
class CustomFieldUpdate(BaseModel):
    field_label: Optional[str] = None
    field_type: Optional[str] = None
    dropdown_options: Optional[List[str]] = None
    is_required: Optional[bool] = None
    is_visible_in_list: Optional[bool] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
 
class CustomFieldResponse(BaseModel):
    field_id: UUID
    entity_type: str
    field_key: str
    field_label: str
    field_type: str
    dropdown_options: Optional[List[str]]
    is_required: bool
    is_visible_in_list: bool
    sort_order: int
    is_active: bool
    created_at: datetime
 
    class Config:
        from_attributes = True
 
class CustomFieldValueSave(BaseModel):
    field_id: UUID
    field_value: str
 
class CustomFieldValueBulkSave(BaseModel):
    entity_type: str
    entity_id: UUID
    values: List[CustomFieldValueSave]
 
class CustomFieldValueResponse(BaseModel):
    value_id: UUID
    field_id: UUID
    entity_type: str
    entity_id: UUID
    field_value: Optional[str]
    created_at: datetime
    updated_at: datetime
 
    class Config:
        from_attributes = True
