from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal

# -- Product Master Schemas --

class ProductBase(BaseModel):
    name: str
    product_code: Optional[str] = None
    description: Optional[str] = None
    unit_of_measurement: str = "NOS"
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    product_code: Optional[str] = None
    description: Optional[str] = None
    unit_of_measurement: Optional[str] = None
    is_active: Optional[bool] = None

class ProductResponse(ProductBase):
    product_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# -- BOM Detail Schemas --

class BomDetailBase(BaseModel):
    rm_id: UUID
    quantity: Decimal = Field(..., gt=0)
    uom: Optional[str] = None
    scrap_percentage: Optional[Decimal] = Field(0, ge=0)

class BomDetailCreate(BomDetailBase):
    pass

class BomDetailResponse(BomDetailBase):
    bom_detail_id: UUID
    bom_id: UUID
    rm_name: Optional[str] = None # Will be populated from RM Master
    rm_part_no: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# -- BOM Master Schemas --

class BomBase(BaseModel):
    product_id: UUID
    bom_number: str
    description: Optional[str] = None
    is_active: bool = True

class BomCreate(BomBase):
    details: List[BomDetailCreate]

class BomUpdate(BaseModel):
    bom_number: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    details: Optional[List[BomDetailCreate]] = None

class BomResponse(BomBase):
    bom_id: UUID
    product_name: Optional[str] = None # Populated from Product Master
    product_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    details: List[BomDetailResponse] = []
    model_config = ConfigDict(from_attributes=True)
