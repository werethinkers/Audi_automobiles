import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Date, Integer, Numeric, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base

def gen_uuid():
    return str(uuid.uuid4())

def now_utc():
    return datetime.utcnow()

class VendorPortalLog(Base):
    __tablename__ = 'vendor_portal_log'
    log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendor_master.vendor_id'), nullable=False)
    session_token = Column(String(128), unique=True, nullable=False)
    ip_address = Column(String(50))
    user_agent = Column(Text)
    issued_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    invalidated_at = Column(DateTime(timezone=True))

class POTrackingLog(Base):
    __tablename__ = 'po_tracking_log'
    tracking_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_id = Column(UUID(as_uuid=True), ForeignKey('rm_purchase_order.po_id'), nullable=False)
    event_type = Column(String(50), nullable=False)
    event_date = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    tracking_ref = Column(String(100))
    notes = Column(Text)
    created_by = Column(UUID(as_uuid=True)) # Staff or Vendor ID depending on event

class ASNLog(Base):
    __tablename__ = 'asn_log'
    asn_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asn_number = Column(String(50), unique=True, nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendor_master.vendor_id'), nullable=False)
    po_id = Column(UUID(as_uuid=True), ForeignKey('rm_purchase_order.po_id'), nullable=False)
    expected_date = Column(Date, nullable=False)
    delivery_mode = Column(String(50), default='SELF', nullable=False)
    courier_name = Column(String(100))
    tracking_number = Column(String(100))
    vehicle_number = Column(String(50))
    driver_name = Column(String(100))
    arrival_window = Column(String(50))
    status = Column(String(30), nullable=False, default='SUBMITTED')
    created_at = Column(DateTime(timezone=True), default=now_utc)

    details = relationship("ASNDetail", back_populates="asn_log", cascade="all, delete-orphan")

class ASNDetail(Base):
    __tablename__ = 'asn_detail'
    asn_detail_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asn_id = Column(UUID(as_uuid=True), ForeignKey('asn_log.asn_id'), nullable=False)
    po_detail_id = Column(UUID(as_uuid=True), ForeignKey('rm_purchase_order_detail.po_detail_id'), nullable=False)
    qty_shipped = Column(Numeric(14, 3), nullable=False)
    vendor_batch_ref = Column(String(100))

    asn_log = relationship("ASNLog", back_populates="details")

class RejectionReasonMaster(Base):
    __tablename__ = 'rejection_reason_master'
    reason_code = Column(String(50), primary_key=True)
    description = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

class RejectionLog(Base):
    __tablename__ = 'rejection_log'
    rejection_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grn_id = Column(UUID(as_uuid=True), ForeignKey('rm_receiving_log.grn_id'), nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendor_master.vendor_id'), nullable=False)
    rln = Column(String(50), unique=True, nullable=False)
    reason_code = Column(String(50), ForeignKey('rejection_reason_master.reason_code'), nullable=False)
    total_qty = Column(Numeric(14, 3), nullable=False)
    status = Column(String(50), nullable=False)
    disposition_deadline = Column(DateTime(timezone=True))
    vendor_response = Column(String(50))
    vendor_responded_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=now_utc)

class RejectionLogDetail(Base):
    __tablename__ = 'rejection_log_detail'
    rejection_detail_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rejection_id = Column(UUID(as_uuid=True), ForeignKey('rejection_log.rejection_id'), nullable=False)
    grn_detail_id = Column(UUID(as_uuid=True), ForeignKey('grn_detail.grn_detail_id'), nullable=False)
    qty = Column(Numeric(14, 3), nullable=False)
    defect_detail = Column(Text)

class RejectionPhoto(Base):
    __tablename__ = 'rejection_photo'
    photo_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rejection_id = Column(UUID(as_uuid=True), ForeignKey('rejection_log.rejection_id'), nullable=False)
    file_path = Column(Text, nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=now_utc)

class NCRLog(Base):
    __tablename__ = 'ncr_log'
    ncr_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rejection_id = Column(UUID(as_uuid=True), ForeignKey('rejection_log.rejection_id'), nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendor_master.vendor_id'), nullable=False)
    ncr_number = Column(String(50), unique=True, nullable=False)
    defect_description = Column(Text, nullable=False)
    disposition_code = Column(String(50))
    car_due = Column(DateTime(timezone=True))
    car_submitted_at = Column(DateTime(timezone=True))
    car_root_cause = Column(Text)
    car_action_taken = Column(Text)
    car_prevention = Column(Text)
    status = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

class DebitNote(Base):
    __tablename__ = 'debit_note'
    debit_note_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendor_master.vendor_id'), nullable=False)
    rejection_id = Column(UUID(as_uuid=True), ForeignKey('rejection_log.rejection_id'))
    dn_number = Column(String(50), unique=True, nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(30), nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

class VendorDisputeLog(Base):
    __tablename__ = 'vendor_dispute_log'
    dispute_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendor_master.vendor_id'), nullable=False)
    entity_type = Column(String(30), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    dispute_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(30), nullable=False)
    resolution_note = Column(Text)
    resolved_by = Column(UUID(as_uuid=True))
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=now_utc)

class VendorScorecard(Base):
    __tablename__ = 'vendor_scorecard'
    scorecard_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendor_master.vendor_id'), nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    deliveries_total = Column(Integer, nullable=False)
    deliveries_on_time = Column(Integer, nullable=False)
    batches_total = Column(Integer, nullable=False)
    batches_first_pass = Column(Integer, nullable=False)
    rejection_count = Column(Integer, nullable=False)
    ncr_count = Column(Integer, nullable=False)
    avg_lead_time_days = Column(Numeric(10, 2))
    calculated_at = Column(DateTime(timezone=True), default=now_utc)

class InspectionDocument(Base):
    __tablename__ = 'inspection_document'
    doc_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    doc_type = Column(String(50), nullable=False)
    file_path = Column(Text, nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=now_utc)

class NotificationLog(Base):
    __tablename__ = 'notification_log'
    notification_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendor_master.vendor_id'))
    recipient = Column(String(255), nullable=False)
    notification_type = Column(String(50), nullable=False)
    subject = Column(String(255))
    content = Column(Text)
    status = Column(String(30), nullable=False)
    sent_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=now_utc)

class VendorPortalActionLog(Base):
    __tablename__ = 'vendor_portal_action_log'
    action_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendor_master.vendor_id'), nullable=False)
    action_type = Column(String(50), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(UUID(as_uuid=True))
    action_details = Column(JSONB)
    ip_address = Column(String(50))
    created_at = Column(DateTime(timezone=True), default=now_utc)

class VendorPortalAdminActionLog(Base):
    __tablename__ = 'vendor_portal_admin_action_log'
    action_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_user_id = Column(UUID(as_uuid=True), nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey('vendor_master.vendor_id'))
    action_type = Column(String(50), nullable=False)
    action_details = Column(JSONB)
    ip_address = Column(String(50))
    created_at = Column(DateTime(timezone=True), default=now_utc)
