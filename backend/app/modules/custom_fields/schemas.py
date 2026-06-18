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
    field_options: Optional[Dict[str, Any]] = None
    is_required: Optional[bool] = False
    is_searchable: Optional[bool] = False
    is_visible_in_list: Optional[bool] = False
    display_order: Optional[int] = 0
    applies_to_groups: Optional[List[str]] = None
    default_value: Optional[Dict[str, Any]] = None
    validation_rules: Optional[Dict[str, Any]] = None
    project_scope: str = 'ALL'

class CustomFieldUpdate(BaseModel):
    field_label: Optional[str] = None
    field_type: Optional[str] = None
    field_options: Optional[Dict[str, Any]] = None
    is_required: Optional[bool] = None
    is_searchable: Optional[bool] = None
    is_visible_in_list: Optional[bool] = None
    display_order: Optional[int] = None
    applies_to_groups: Optional[List[str]] = None
    default_value: Optional[Dict[str, Any]] = None
    validation_rules: Optional[Dict[str, Any]] = None
    project_scope: Optional[str] = None
    is_active: Optional[bool] = None

class CustomFieldResponse(BaseModel):
    field_id: UUID
    entity_type: str
    field_key: str
    field_label: str
    field_type: str
    field_options: Optional[Dict[str, Any]]
    is_required: bool
    is_searchable: bool
    is_visible_in_list: bool
    display_order: int
    applies_to_groups: Optional[List[str]]
    default_value: Optional[Dict[str, Any]]
    validation_rules: Optional[Dict[str, Any]]
    project_scope: str
    is_active: bool
    created_at: datetime
    created_by: Optional[UUID]

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
