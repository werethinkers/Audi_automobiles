import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, Boolean, DateTime, Date, Integer, Numeric, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.core.database import Base

def now_utc():
    return datetime.utcnow()

class ProductMaster(Base):
    """
    Finished Product Master Table.
    Purpose: Defines all finished products that the company manufactures.
    """
    __tablename__ = 'product_master'
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    product_code: Mapped[str | None] = mapped_column(String(100), unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    unit_of_measurement: Mapped[str] = mapped_column(String(50), nullable=False, default="NOS")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    boms = relationship("BomMaster", back_populates="product")

class BomMaster(Base):
    """
    Bill of Materials (BOM) Header Table.
    Purpose: Defines the recipe for a product.
    """
    __tablename__ = 'bom_master'
    bom_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('product_master.product_id'), nullable=False)
    bom_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    product = relationship("ProductMaster", back_populates="boms")
    details = relationship("BomDetail", back_populates="bom", cascade="all, delete-orphan")

class BomDetail(Base):
    """
    BOM Detail/Component Table.
    Purpose: Lists the raw materials required for a specific BOM.
    """
    __tablename__ = 'bom_detail'
    bom_detail_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bom_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('bom_master.bom_id'), nullable=False)
    rm_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('rm_master.rm_id'), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14,4), nullable=False)
    uom: Mapped[str | None] = mapped_column(String(50))
    scrap_percentage: Mapped[Decimal | None] = mapped_column(Numeric(5,2), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relationships
    bom = relationship("BomMaster", back_populates="details")
    # For RM lookup
    # We can rely on rm_id to join with rm_master.
