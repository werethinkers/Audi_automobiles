import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, Boolean, DateTime, Date, Integer
from sqlalchemy import Numeric, Text, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.core.database import Base
 
def gen_uuid():
    return str(uuid.uuid4())
 
def now_utc():
    return datetime.utcnow()
 
# ── LOOKUP MASTERS ────────────────────────────────────
class ProcurementSourceMaster(Base):
    __tablename__ = 'procurement_source_master'
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
 
class MaterialTypeMaster(Base):
    __tablename__ = 'material_type_master'
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
 
class PoStatusMaster(Base):
    __tablename__ = 'po_status_master'
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String(100), nullable=False)
    code        = Column(String(50), unique=True, nullable=False)
    # is_terminal = Column(Boolean, default=False)
    description = Column(Text)
    # sort_order  = Column(Integer, default=0)
    created_at  = Column(DateTime(timezone=True), default=now_utc)
 
# ── CORE MASTERS ──────────────────────────────────────
class RmMaster(Base):
    __tablename__ = 'rm_master'
    rm_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    part_no: Mapped[str | None] = mapped_column(String(100), unique=True)
    unit_of_measurement: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    material_type_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey('material_type_master.id'))
    procurement_source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey('procurement_source_master.id'))
    # reorder_level         = Column(Numeric(14,3))
    minimum_stock: Mapped[Decimal | None] = mapped_column(Numeric(14,3))
    lead_time_days: Mapped[int | None] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
 
class VendorMaster(Base):
    __tablename__ = 'vendor_master'
    vendor_id      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name           = Column(String(255), nullable=False)
    contact_person = Column(String(150))
    phone          = Column(String(20))
    email          = Column(String(255))
    gst_number     = Column(String(30), unique=True)
    # pan_number     = Column(String(20))
    address_line1  = Column(String(255))
    city           = Column(String(100))
    state          = Column(String(100))
    payment_terms  = Column(String(100))
    is_active      = Column(Boolean, nullable=False, default=True)
    created_at     = Column(DateTime(timezone=True), default=now_utc)
    updated_at     = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
 
class StoreMaster(Base):
    __tablename__ = 'store_master'
    store_id   = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_name = Column(String(150), nullable=False)
    # store_code = Column(String(30), unique=True)
    # store_type = Column(String(50), nullable=False)
    location   = Column(String(200))
    is_active  = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)
 
# ── MAPPING TABLES ────────────────────────────────────
class RmVendorMapping(Base):
    __tablename__ = 'rm_vendor_mapping'
    __table_args__ = (UniqueConstraint('rm_id','vendor_id'),)
    mapping_id    = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rm_id         = Column(UUID(as_uuid=True), ForeignKey('rm_master.rm_id'), nullable=False)
    vendor_id     = Column(UUID(as_uuid=True), ForeignKey('vendor_master.vendor_id'), nullable=False)
    standard_cost = Column(Numeric(14,2))
    # currency      = Column(String(10), default='INR')
    # is_preferred  = Column(Boolean, default=False)
    is_active     = Column(Boolean, nullable=False, default=True)
    description   = Column(Text)
    created_at    = Column(DateTime(timezone=True), default=now_utc)
 
class RmStoreMapping(Base):
    __tablename__ = 'rm_store_mapping'
    __table_args__ = (UniqueConstraint('rm_id','store_id'),)
    mapping_id      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rm_id           = Column(UUID(as_uuid=True), ForeignKey('rm_master.rm_id'), nullable=False)
    store_id        = Column(UUID(as_uuid=True), ForeignKey('store_master.store_id'), nullable=False)
    min_stock_level = Column(Numeric(14,3))
    max_stock_level = Column(Numeric(14,3))
    is_active       = Column(Boolean, nullable=False, default=True)
    created_at      = Column(DateTime(timezone=True), default=now_utc)
 
# ── PROCUREMENT ───────────────────────────────────────
class RmPurchaseOrder(Base):
    __tablename__ = 'rm_purchase_order'
    po_id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_number              = Column(String(50), unique=True)
    vendor_id              = Column(UUID(as_uuid=True), ForeignKey('vendor_master.vendor_id'))
    order_date             = Column(Date, nullable=False)
    expected_delivery_date = Column(Date)
    status_id              = Column(UUID(as_uuid=True), ForeignKey('po_status_master.id'))
    total_amount           = Column(Numeric(14,2))
    notes                  = Column(Text)
    created_at             = Column(DateTime(timezone=True), default=now_utc)
    updated_at             = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
 
    details = relationship("RmPoDetail", back_populates="purchase_order", cascade="all, delete-orphan")
 
class RmPoDetail(Base):
    __tablename__ = 'rm_purchase_order_detail'
    po_detail_id  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_id         = Column(UUID(as_uuid=True), ForeignKey('rm_purchase_order.po_id'), nullable=False)
    rm_id         = Column(UUID(as_uuid=True), ForeignKey('rm_master.rm_id'), nullable=False)
    order_qty     = Column(Numeric(14,3), nullable=False)
    received_qty  = Column(Numeric(14,3), default=0)
    unit_price    = Column(Numeric(14,2), nullable=False)
    gst_percent   = Column(Numeric(5,2))
    line_amount   = Column(Numeric(14,2))  #order_qty × unit_price (auto-calculated)
    line_status   = Column(String(30), default='OPEN') #line_status	VARCHAR(30)		OPEN | PARTIALLY_RECEIVED | FULLY_RECEIVED | CANCELLED
    created_at    = Column(DateTime(timezone=True), default=now_utc)
 
    purchase_order = relationship("RmPurchaseOrder", back_populates="details")
 
# ── RECEIVING / GRN ───────────────────────────────────
class RmReceivingLog(Base):
    __tablename__ = 'rm_receiving_log'
    grn_id        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grn_number    = Column(String(50), unique=True)
    po_id         = Column(UUID(as_uuid=True), ForeignKey('rm_purchase_order.po_id'))
    vendor_id     = Column(UUID(as_uuid=True), ForeignKey('vendor_master.vendor_id'))
    received_date = Column(Date, nullable=False)
    vehicle_number= Column(String(50))
  #  dc_number     = Column(String(100))  #Vendor delivery challan number
    grn_status    = Column(String(30), default='PENDING_QA')
    remarks       = Column(Text)
    created_at    = Column(DateTime(timezone=True), default=now_utc)
    updated_at    = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
 
    details = relationship("GrnDetail", back_populates="receiving_log", cascade="all, delete-orphan")
 
class GrnDetail(Base):
    __tablename__ = 'grn_detail'
    grn_detail_id  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grn_id         = Column(UUID(as_uuid=True), ForeignKey('rm_receiving_log.grn_id'))
    po_detail_id   = Column(UUID(as_uuid=True), ForeignKey('rm_purchase_order_detail.po_detail_id'))
    rm_id          = Column(UUID(as_uuid=True), ForeignKey('rm_master.rm_id'))
    received_qty   = Column(Numeric(14,3), nullable=False)
    accepted_qty   = Column(Numeric(14,3))
    rejected_qty   = Column(Numeric(14,3))
    rejection_reason=Column(Text)
    store_id       = Column(UUID(as_uuid=True), ForeignKey('store_master.store_id'))
    created_at     = Column(DateTime(timezone=True), default=now_utc)
 
    receiving_log = relationship("RmReceivingLog", back_populates="details")
 
# ── INVENTORY ─────────────────────────────────────────
class RmInventory(Base):
    __tablename__ = 'rm_inventory'
    __table_args__ = (UniqueConstraint('rm_id','store_id'),)
    inventory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rm_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('rm_master.rm_id'), nullable=False)
    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey('store_master.store_id'), nullable=False)
    current_qty: Mapped[Decimal] = mapped_column(Numeric(14,3), nullable=False, default=0)
    reserved_qty: Mapped[Decimal | None] = mapped_column(Numeric(14,3), default=0)
    in_transit_qty: Mapped[Decimal | None] = mapped_column(Numeric(14,3), default=0)
    last_updated: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

class RmInventoryLog(Base):
    __tablename__ = 'rm_inventory_log'
    log_id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rm_id            = Column(UUID(as_uuid=True), ForeignKey('rm_master.rm_id'), nullable=False)
    store_id         = Column(UUID(as_uuid=True), ForeignKey('store_master.store_id'), nullable=False)
    transaction_type = Column(String(50), nullable=False) #GRN_RECEIPT | CONSUMPTION | TRANSFER_OUT | TRANSFER_IN | ADJUSTMENT_ADD | ADJUSTMENT_DEDUCT | REJECTION | RETURN_TO_VENDOR
    qty              = Column(Numeric(14,3), nullable=False)
    balance_before   = Column(Numeric(14,3), nullable=False)
    balance_after    = Column(Numeric(14,3), nullable=False)
    reference_type   = Column(String(50))
    reference_id     = Column(UUID(as_uuid=True))
    remarks          = Column(Text)
    created_at       = Column(DateTime(timezone=True), default=now_utc)
 
class RmConsumptionLog(Base):
    __tablename__ = 'rm_consumption_log'
    consumption_id   = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rm_id            = Column(UUID(as_uuid=True), ForeignKey('rm_master.rm_id'), nullable=False)
    store_id         = Column(UUID(as_uuid=True), ForeignKey('store_master.store_id'), nullable=False)
    qty_used         = Column(Numeric(14,3), nullable=False)
    consumption_type = Column(String(50), nullable=False, default='MANUAL')
    consumed_date    = Column(Date, nullable=False)
    description      = Column(Text)
    remarks          = Column(Text)
    created_at       = Column(DateTime(timezone=True), default=now_utc)
 
# ── CUSTOM FIELDS ─────────────────────────────────────
class EntityCustomField(Base):
    __tablename__ = 'entity_custom_fields'
    field_id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type       = Column(String(100), nullable=False)
    field_key         = Column(String(100), nullable=False)
    field_label       = Column(String(150), nullable=False)
    field_type        = Column(String(50), nullable=False)
    dropdown_options  = Column(JSONB)
    is_required       = Column(Boolean, nullable=False, default=False)
    is_visible_in_list= Column(Boolean, default=False)
    sort_order        = Column(Integer, default=0)
    is_active         = Column(Boolean, nullable=False, default=True)
    created_at        = Column(DateTime(timezone=True), default=now_utc)
 
class EntityCustomFieldValue(Base):
    __tablename__ = 'entity_custom_field_values'
    __table_args__ = (Index('ix_ecfv_entity', 'entity_type', 'entity_id'),)
    value_id    = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    field_id    = Column(UUID(as_uuid=True), ForeignKey('entity_custom_fields.field_id'))
    entity_type = Column(String(100), nullable=False)
    entity_id   = Column(UUID(as_uuid=True), nullable=False)
    field_value = Column(Text)
    created_at  = Column(DateTime(timezone=True), default=now_utc)
    updated_at  = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
