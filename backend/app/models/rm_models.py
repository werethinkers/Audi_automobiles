import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Date, Integer, Float
from sqlalchemy import Numeric, Text, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

def now_utc():
    return datetime.utcnow()

# ── AUTH & SUPPORTING TABLES ──────────────────────────
class RoleMaster(Base):
    __tablename__ = 'role_master'
    role_id     = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_code   = Column(String(20), unique=True, nullable=False)
    role_name   = Column(String(60), nullable=False)
    description = Column(Text)
    is_active   = Column(Boolean, nullable=False, default=True)
    created_at  = Column(DateTime(timezone=True), default=now_utc)

class LoginUser(Base):
    __tablename__ = 'login_users'
    user_id       = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_code = Column(String(30), unique=True, nullable=False)
    name          = Column(String(255), nullable=False)
    mobile        = Column(String(20), unique=True)
    email         = Column(String(255), unique=True)
    password_hash = Column(String(255), nullable=False)
    role_id       = Column(String(20), ForeignKey('role_master.role_code'), nullable=False)
    is_active     = Column(Boolean, nullable=False, default=True)
    last_login_at = Column(DateTime(timezone=True))
    created_by    = Column(UUID(as_uuid=True), ForeignKey('login_users.user_id'))
    created_at    = Column(DateTime(timezone=True), default=now_utc)
    updated_at    = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

class SectionTypeMaster(Base):
    __tablename__ = 'section_type_master'
    section_type_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    section_type    = Column(String(50), unique=True, nullable=False)
    description     = Column(Text)
    is_active       = Column(Boolean, nullable=False, default=True)

# ── LOOKUP MASTERS ────────────────────────────────────
class ProcurementSourceMaster(Base):
    __tablename__ = 'procurement_source_master'
    source_id   = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_code = Column(String(30), unique=True, nullable=False)
    source_name = Column(String(100), nullable=False)
    description = Column(Text)
    requires_po = Column(Boolean, nullable=False, default=True)
    is_active   = Column(Boolean, nullable=False, default=True)

class MaterialTypeMaster(Base):
    __tablename__ = 'material_type_master'
    type_id     = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type_code   = Column(String(50), unique=True, nullable=False)
    type_name   = Column(String(100), nullable=False)
    description = Column(Text)
    is_active   = Column(Boolean, nullable=False, default=True)
    created_at  = Column(DateTime(timezone=True), default=now_utc)

class PoStatusMaster(Base):
    __tablename__ = 'po_status_master'
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status_code     = Column(String(35), unique=True, nullable=False)
    name            = Column(String(100), nullable=False)
    description     = Column(Text)
    display_colour  = Column(String(10))
    sort_order      = Column(Integer, nullable=False, default=0)

# ── CORE MASTERS ──────────────────────────────────────
class VendorMaster(Base):
    __tablename__ = 'vendor_master'
    vendor_id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_code         = Column(String(30), unique=True, nullable=False)
    vendor_name         = Column(String(255), nullable=False)
    contact_person      = Column(String(255))
    contact_mobile      = Column(String(20))
    contact_email       = Column(String(255))
    address             = Column(Text)
    city                = Column(String(100))
    state               = Column(String(50))
    gst_number          = Column(String(20))
    vendor_type         = Column(String(20), nullable=False, default='SUPPLIER')
    payment_terms       = Column(Integer, nullable=False, default=30)
    payment_mode        = Column(String(20), nullable=False, default='BANK_TRANSFER')
    bank_account_number = Column(String(30))
    bank_ifsc           = Column(String(15))
    bank_name           = Column(String(100))
    approved_item_codes = Column(ARRAY(Text), nullable=False, default=[])
    portal_enabled      = Column(Boolean, nullable=False, default=False)
    portal_username     = Column(String(100), unique=True)
    is_active           = Column(Boolean, nullable=False, default=True)
    custom_fields       = Column(JSONB, nullable=False, default={})
    created_at          = Column(DateTime(timezone=True), default=now_utc)
    updated_at          = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

class StoreMaster(Base):
    __tablename__ = 'store_master'
    store_id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_code          = Column(String(50), unique=True, nullable=False)
    store_name          = Column(String(200), nullable=False)
    store_type          = Column(String(25), nullable=False)
    store_location      = Column(String(200))
    manager_id          = Column(UUID(as_uuid=True), ForeignKey('login_users.user_id'))
    allows_direct_issue = Column(Boolean, nullable=False, default=False)
    is_active           = Column(Boolean, nullable=False, default=True)
    created_at          = Column(DateTime(timezone=True), default=now_utc)

class RmMaster(Base):
    __tablename__ = 'rm_master'
    rm_id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    part_number           = Column(String(100), unique=True, nullable=False)
    part_name             = Column(String(255), nullable=False)
    part_no_client        = Column(String(100))
    part_type             = Column(String(20), nullable=False, default='FINISHED_PART')
    material_type_id      = Column(UUID(as_uuid=True), ForeignKey('material_type_master.type_id'))
    sourcing_type         = Column(String(20), nullable=False, default='BOP')
    procurement_source_id = Column(UUID(as_uuid=True), ForeignKey('procurement_source_master.source_id'))
    description           = Column(Text)
    unit_of_measurement   = Column(String(20), nullable=False, default='NOS')
    standard_cost         = Column(Numeric(14,4))
    reorder_level         = Column(Numeric(14,3))
    weight_per_piece_kg   = Column(Numeric(12,6))
    minimum_stock         = Column(Numeric(14,3))
    lead_time_days        = Column(Integer)
    rm_section            = Column(String(30))
    rm_thickness          = Column(Float)
    rm_section_type       = Column(String(30), ForeignKey('section_type_master.section_type'))
    rm_grade              = Column(String(10))
    standard_length_mm    = Column(Float)
    cut_length            = Column(Float)
    design_length         = Column(Float)
    cal_weight            = Column(Float)
    hsn_code              = Column(String(20))
    gst_rate_pct          = Column(Numeric(6,2), default=18.00)
    is_active             = Column(Boolean, nullable=False, default=True)
    custom_fields         = Column(JSONB, nullable=False, default={})
    created_by            = Column(UUID(as_uuid=True), ForeignKey('login_users.user_id'))
    created_at            = Column(DateTime(timezone=True), default=now_utc)
    updated_at            = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

# ── MAPPING TABLES ────────────────────────────────────
class RmVendorMapping(Base):
    __tablename__ = 'rm_vendor_mapping'
    __table_args__ = (UniqueConstraint('rm_id','vendor_id'),)
    mapping_id      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rm_id           = Column(UUID(as_uuid=True), ForeignKey('rm_master.rm_id'), nullable=False) # Kept rm_id
    vendor_id       = Column(UUID(as_uuid=True), ForeignKey('vendor_master.vendor_id'), nullable=False)
    unit_price      = Column(Numeric(14,4))
    price_basis     = Column(String(15), nullable=False, default='PER_UNIT')
    moq             = Column(Integer)
    lead_time_days  = Column(Integer)
    is_preferred    = Column(Boolean, nullable=False, default=False)
    last_price_date = Column(Date)
    description     = Column(Text)
    is_active       = Column(Boolean, nullable=False, default=True)
    created_at      = Column(DateTime(timezone=True), default=now_utc)

class RmStoreMapping(Base):
    __tablename__ = 'rm_store_mapping'
    __table_args__ = (UniqueConstraint('rm_id','store_id'),)
    mapping_id       = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rm_id            = Column(UUID(as_uuid=True), ForeignKey('rm_master.rm_id'), nullable=False) # Kept rm_id
    store_id         = Column(UUID(as_uuid=True), ForeignKey('store_master.store_id'), nullable=False)
    is_primary_store = Column(Boolean, nullable=False, default=True)
    bin_hint         = Column(String(50))
    min_qty          = Column(Numeric(14,3))
    max_qty          = Column(Numeric(14,3))
    is_active        = Column(Boolean, nullable=False, default=True)

# ── PROCUREMENT ───────────────────────────────────────
class RmPurchaseOrder(Base):
    __tablename__ = 'rm_purchase_order'
    po_id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_number          = Column(String(50), unique=True, nullable=False)
    vendor_id          = Column(UUID(as_uuid=True), ForeignKey('vendor_master.vendor_id'), nullable=False)
    order_date         = Column(Date, nullable=False, default=datetime.utcnow().date)
    expected_date      = Column(Date)
    status             = Column(String(35), ForeignKey('po_status_master.status_code'), nullable=False, default='DRAFT')
    po_type            = Column(String(20), nullable=False, default='STANDARD')
    created_by         = Column(UUID(as_uuid=True), ForeignKey('login_users.user_id'), nullable=False)
    approved_by        = Column(UUID(as_uuid=True), ForeignKey('login_users.user_id'))
    approved_at        = Column(DateTime(timezone=True))
    total_weight_kg    = Column(Numeric(14,3))
    total_amount       = Column(Numeric(14,2))
    total_with_tax     = Column(Numeric(14,2))
    freight_amount     = Column(Numeric(12,2))
    payment_terms_days = Column(Integer)
    cancelled_by       = Column(UUID(as_uuid=True), ForeignKey('login_users.user_id'))
    cancel_reason      = Column(Text)
    remarks            = Column(Text)
    custom_fields      = Column(JSONB, nullable=False, default={})
    created_at         = Column(DateTime(timezone=True), default=now_utc)
    updated_at         = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    details = relationship("RmPurchaseOrderDetails", back_populates="purchase_order", cascade="all, delete-orphan")

class RmPurchaseOrderDetails(Base):
    __tablename__ = 'rm_purchase_order_details'
    po_detail_id        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_id               = Column(UUID(as_uuid=True), ForeignKey('rm_purchase_order.po_id'), nullable=False)
    rm_id               = Column(UUID(as_uuid=True), ForeignKey('rm_master.rm_id'), nullable=False) # Kept rm_id
    ordered_quantity    = Column(Numeric(14,3), nullable=False)
    received_quantity   = Column(Numeric(14,3), nullable=False, default=0)
    unit_price          = Column(Numeric(14,4))
    price_per_kg        = Column(Numeric(14,4))
    price_basis         = Column(String(15), nullable=False, default='PER_UNIT')
    calculated_weight   = Column(Numeric(14,3))
    line_total_amount   = Column(Numeric(14,2))
    hsn_code            = Column(String(20))
    gst_rate_pct        = Column(Numeric(6,2), default=18.00)
    line_cgst           = Column(Numeric(12,2))
    line_sgst           = Column(Numeric(12,2))
    line_igst           = Column(Numeric(12,2), default=0)
    line_total_with_tax = Column(Numeric(14,2))
    status              = Column(String(20), nullable=False, default='PENDING')
    custom_fields       = Column(JSONB, nullable=False, default={})

    purchase_order = relationship("RmPurchaseOrder", back_populates="details")

# ── RECEIVING / GRN ───────────────────────────────────
class RmReceivingLog(Base):
    __tablename__ = 'rm_receiving_log'
    grn_id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grn_number     = Column(String(50), unique=True, nullable=False)
    gate_entry_id  = Column(UUID(as_uuid=True)) # No FK constraint intentionally
    gate_log_id    = Column(UUID(as_uuid=True)) # No FK constraint intentionally
    po_id          = Column(UUID(as_uuid=True), ForeignKey('rm_purchase_order.po_id'), nullable=False)
    vendor_id      = Column(UUID(as_uuid=True), ForeignKey('vendor_master.vendor_id'), nullable=False)
    received_by    = Column(UUID(as_uuid=True), ForeignKey('login_users.user_id'), nullable=False)
    received_date  = Column(Date, nullable=False, default=datetime.utcnow().date)
    vehicle_number = Column(String(20))
    grn_status     = Column(String(20), nullable=False, default='PENDING_QC')
    notes          = Column(Text)
    created_at     = Column(DateTime(timezone=True), default=now_utc)
    updated_at     = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    details = relationship("GrnDetail", back_populates="receiving_log", cascade="all, delete-orphan")

class GrnDetail(Base):
    __tablename__ = 'grn_detail'
    batch_id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grn_id               = Column(UUID(as_uuid=True), ForeignKey('rm_receiving_log.grn_id'), nullable=False)
    po_detail_id         = Column(UUID(as_uuid=True), ForeignKey('rm_purchase_order_details.po_detail_id'))
    batch_code           = Column(String(100), unique=True, nullable=False)
    rm_id                = Column(UUID(as_uuid=True), ForeignKey('rm_master.rm_id'), nullable=False) # Kept rm_id
    qty_received         = Column(Numeric(14,3), nullable=False)
    qty_accepted         = Column(Numeric(14,3), nullable=False, default=0)
    qty_rejected         = Column(Numeric(14,3), nullable=False, default=0)
    rejection_reason     = Column(Text)
    weight_received_kg   = Column(Numeric(14,3))
    uom                  = Column(String(20), nullable=False, default='NOS')
    batch_status         = Column(String(20), nullable=False, default='PENDING_QC')
    destination_store_id = Column(UUID(as_uuid=True), ForeignKey('store_master.store_id'))
    assigned_operator_id = Column(UUID(as_uuid=True), ForeignKey('login_users.user_id'))
    bin_location         = Column(String(50))
    location_type        = Column(String(20), nullable=False, default='MAIN')
    fifo_rank            = Column(Integer)
    received_at          = Column(DateTime(timezone=True), default=now_utc)
    custom_fields        = Column(JSONB, nullable=False, default={})

    receiving_log = relationship("RmReceivingLog", back_populates="details")

# ── INVENTORY ─────────────────────────────────────────
class RmInventory(Base):
    __tablename__ = 'rm_inventory'
    __table_args__ = (UniqueConstraint('rm_id','store_id','location_type','bin_location','batch_id'),)
    inventory_id        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rm_id               = Column(UUID(as_uuid=True), ForeignKey('rm_master.rm_id'), nullable=False) # Kept rm_id
    store_id            = Column(UUID(as_uuid=True), ForeignKey('store_master.store_id'), nullable=False)
    location_type       = Column(String(20), nullable=False, default='MAIN')
    bin_location        = Column(String(50))
    batch_id            = Column(UUID(as_uuid=True), ForeignKey('grn_detail.batch_id'))
    current_stock_pcs   = Column(Numeric(14,3), nullable=False, default=0)
    reserved_pcs        = Column(Numeric(14,3), nullable=False, default=0)
    wip_pcs             = Column(Numeric(14,3), nullable=False, default=0)
    pending_putaway_pcs = Column(Numeric(14,3), nullable=False, default=0)
    in_transit_qty      = Column(Numeric(14,3), nullable=False, default=0)
    last_updated        = Column(DateTime(timezone=True), default=now_utc)

class RmInventoryLog(Base):
    __tablename__ = 'rm_inventory_log'
    log_id                    = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rm_id                     = Column(UUID(as_uuid=True), ForeignKey('rm_master.rm_id'), nullable=False) # Kept rm_id
    store_id                  = Column(UUID(as_uuid=True), ForeignKey('store_master.store_id'))
    location_type             = Column(String(20), nullable=False, default='MAIN')
    batch_id                  = Column(UUID(as_uuid=True), ForeignKey('grn_detail.batch_id'))
    balance_before            = Column(Numeric(14,3), nullable=False, default=0)
    change_quantity_pcs       = Column(Numeric(14,3), nullable=False)
    new_quantity_after_change = Column(Numeric(14,3), nullable=False)
    transaction_type          = Column(String(30), nullable=False)
    reference_type            = Column(String(50))
    reference_id              = Column(UUID(as_uuid=True))
    updated_by                = Column(UUID(as_uuid=True), ForeignKey('login_users.user_id'), nullable=False)
    remarks                   = Column(Text)
    transaction_date          = Column(DateTime(timezone=True), default=now_utc)

class RmConsumptionLog(Base):
    __tablename__ = 'rm_consumption_log'
    log_id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rm_id               = Column(UUID(as_uuid=True), ForeignKey('rm_master.rm_id'), nullable=False) # Kept rm_id
    store_id            = Column(UUID(as_uuid=True), ForeignKey('store_master.store_id'))
    qty_used            = Column(Numeric(14,3), nullable=False)
    weight_used_kg      = Column(Numeric(14,3))
    planned_date        = Column(Date)
    usage_date          = Column(DateTime(timezone=True), default=now_utc)
    consumption_type    = Column(String(20), nullable=False, default='PLANNED')
    rm_inventory_log_id = Column(UUID(as_uuid=True), ForeignKey('rm_inventory_log.log_id'))
    updated_by          = Column(UUID(as_uuid=True), ForeignKey('login_users.user_id'), nullable=False)
    description         = Column(Text)
    remarks             = Column(Text)

# ── CUSTOM FIELDS ─────────────────────────────────────
class CustomFieldDefinition(Base):
    __tablename__ = 'custom_field_definition'
    field_id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type        = Column(String(50), nullable=False)
    field_key          = Column(String(50), nullable=False)
    field_label        = Column(String(100), nullable=False)
    field_type         = Column(String(20), nullable=False)
    field_options      = Column(JSONB)
    is_required        = Column(Boolean, nullable=False, default=False)
    is_searchable      = Column(Boolean, nullable=False, default=False)
    is_visible_in_list = Column(Boolean, nullable=False, default=False)
    display_order      = Column(Integer, nullable=False, default=0)
    applies_to_groups  = Column(ARRAY(Text))
    default_value      = Column(JSONB)
    validation_rules   = Column(JSONB)
    project_scope      = Column(String(20), nullable=False, default='ALL')
    is_active          = Column(Boolean, nullable=False, default=True)
    created_by         = Column(UUID(as_uuid=True), ForeignKey('login_users.user_id'))
    created_at         = Column(DateTime(timezone=True), default=now_utc)
    
    __table_args__ = (UniqueConstraint('entity_type', 'field_key'),)

class EntityCustomFieldValues(Base):
    __tablename__ = 'entity_custom_field_values'
    value_id    = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    field_id    = Column(UUID(as_uuid=True), ForeignKey('custom_field_definition.field_id'), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id   = Column(UUID(as_uuid=True), nullable=False)
    field_value = Column(Text)
    created_at  = Column(DateTime(timezone=True), default=now_utc)
    updated_at  = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    
    __table_args__ = (UniqueConstraint('field_id', 'entity_id'),)
