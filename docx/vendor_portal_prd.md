# Vendor / Supplier Portal — Product Requirements Document

**Project:** Astute Bridge ERP — Procurement Module
**Document Version:** 1.0
**Date:** June 2026
**Tech Stack:** Python 3.12 · PostgreSQL 16 · SQLAlchemy 2.0 (ORM) · Alembic (migrations) · FastAPI

---

## 1. Purpose

The procurement schema currently in development (`schema.sql`) covers RM master data, purchase orders, GRN, inventory, and vendor mapping — but vendors themselves have **no way to interact with the system**. Every PO confirmation, dispatch update, and rejection response still happens over phone/WhatsApp and gets re-typed into Excel or Tally.

This PRD defines the **Vendor Portal** — a vendor-facing web application backed by the same PostgreSQL database, that lets approved vendors log in, see their own POs, confirm dispatches, and respond to quality rejections, while writing back into the same tables the internal team already uses.

---

## 2. Goals

1. Vendors can acknowledge/decline POs digitally — replacing phone confirmation.
2. Vendors submit an Advance Shipment Notice (ASN) before dispatch so the gate/store team can plan receiving.
3. Vendors see GRN outcomes and rejection details without calling the store team.
4. Vendors respond to rejections and quality non-conformances directly.
5. Every vendor action is logged immutably for dispute resolution.
6. A vendor can **never** see or modify another vendor's data.

## 3. Non-Goals (Phase 1)

- Vendor invoice upload / 3-way match automation (Phase 2)
- Vendor self-registration (vendors are onboarded by the internal Purchase team only)
- Mobile app (web-responsive only for Phase 1)
- Multi-user accounts per vendor company (one login per vendor for now)

---

## 4. Personas

| Persona | Description | Primary Need |
|---|---|---|
| **Vendor User** | Supplier's sales/dispatch coordinator | See POs, confirm dispatch, respond to rejections |
| **Purchase Manager** | Internal staff | Enable portal access, monitor vendor responses |
| **Store/QC Team** | Internal staff | See vendor ASN before goods arrive, raise rejections |
| **System Admin** | Internal staff | Manage vendor portal credentials, view audit trail |

---

## 5. Current Schema Gaps

The uploaded `schema.sql` has no concept of:

| Missing capability | Required for |
|---|---|
| Vendor login / session | All portal access |
| OTP verification | Passwordless auth |
| PO tracking events (dispatch, in-transit) | SP-3 / SP-4 |
| Advance Shipment Notice | SP-3 |
| Rejection / NCR / Debit Note | SP-5 |
| Vendor-side action audit trail | Dispute resolution, compliance |
| Vendor performance scorecard | SP-7 |
| Document upload record | SP-6 |
| Notification record (OTP/alerts) | SP-1, SP-5 |
| Internal staff user table | `created_by` / `resolved_by` references |

All of the above are added in Section 8, along with the admin-side audit table introduced in Section 7. Naming follows the exact convention already used in `schema.sql`: `snake_case`, `_master` / `_log` / `_detail` suffixes, `UUID NOT NULL` primary keys with **no DB-level default** (IDs are generated in the application layer via SQLAlchemy, matching how `rm_master`, `vendor_master`, etc. are already defined — no `gen_random_uuid()` default anywhere in the existing schema).

---

## 6. Functional Requirements — Modules SP-1 to SP-7

### SP-1 — Authentication & Session

| Req ID | Requirement |
|---|---|
| SP1-01 | Vendor logs in using `portal_username` (mobile or email) — no password |
| SP1-02 | System sends a 6-digit OTP valid for 5 minutes |
| SP1-03 | On verified OTP, a session is created with an 8-hour expiry |
| SP1-04 | JWT (RS256) is issued; payload includes `vendor_id`, `sub_type=vendor`, `session_id` |
| SP1-05 | Vendor can log out — session is invalidated immediately |
| SP1-06 | Max 5 OTP requests per vendor per hour (rate limiting via `vendor_otp_log`) |
| SP1-07 | Only vendors with `portal_enabled = TRUE` can request OTP |

**Acceptance criteria:** A disabled vendor (`portal_enabled = FALSE`) gets a generic "portal access not enabled, contact procurement team" message — not a stack trace, not a hint that the username doesn't exist (avoid account enumeration).

### SP-2 — Purchase Order View & Acknowledgement

| Req ID | Requirement |
|---|---|
| SP2-01 | Vendor sees all POs where `vendor_id` = their own, excluding `DRAFT` status |
| SP2-02 | PO detail view shows line items (`rm_purchase_order_detail`), qty, unit price, GST, line amount |
| SP2-03 | Vendor can acknowledge a PO → status moves to `ACKNOWLEDGED` |
| SP2-04 | Vendor can decline a PO with a mandatory reason → status moves to `DECLINED`, internal team is alerted |
| SP2-05 | Acknowledgement/decline is only allowed once per PO (idempotent — second attempt is rejected) |
| SP2-06 | Every PO status change writes a row to `po_tracking_log` |

### SP-3 — Advance Shipment Notice (ASN)

| Req ID | Requirement |
|---|---|
| SP3-01 | Vendor can submit one ASN per PO (or partial ASN per line) before dispatch |
| SP3-02 | ASN requires: expected delivery date, vehicle number, driver name, and per-line shipped quantity |
| SP3-03 | `qty_shipped` per line cannot exceed `order_qty − received_qty` on that PO line |
| SP3-04 | ASN creates a `po_tracking_log` event of type `IN_TRANSIT` |
| SP3-05 | Store/gate team can see all pending ASNs to plan receiving |

### SP-4 — Dispatch Confirmation

| Req ID | Requirement |
|---|---|
| SP4-01 | Vendor confirms physical dispatch against a submitted ASN |
| SP4-02 | Confirmation writes `po_tracking_log` event `VENDOR_DISPATCHED` |
| SP4-03 | `rm_inventory.in_transit_qty` is incremented for each item on the ASN |
| SP4-04 | `in_transit_qty` is decremented when the GRN (`rm_receiving_log`) is created against that PO |

### SP-5 — Rejection & NCR Response

| Req ID | Requirement |
|---|---|
| SP5-01 | Vendor sees rejection lots (`rejection_log`) raised against their GRNs |
| SP5-02 | Vendor sees rejection line items and photos of the defect |
| SP5-03 | Vendor acknowledges rejection and selects response: `WILL_REPLACE` / `WILL_COLLECT` |
| SP5-04 | Vendor sees NCRs (`ncr_log`) and can submit a Corrective Action Report (CAR) |
| SP5-05 | Vendor can raise a dispute on a rejection or NCR (`vendor_dispute_log`) |
| SP5-06 | Vendor sees any debit note (`debit_note`) raised against them — read-only |
| SP5-07 | If vendor does not respond within `disposition_deadline`, an internal escalation notification fires |

### SP-6 — Document Upload

| Req ID | Requirement |
|---|---|
| SP6-01 | Vendor can upload delivery challan, test certificate, mill certificate against a GRN or PO |
| SP6-02 | Accepted file types: PDF, JPG, PNG — max 10 MB |
| SP6-03 | Files are stored in object storage (MinIO/S3); only the path is stored in `inspection_document` |
| SP6-04 | Internal store/QC team can view uploaded documents inside the GRN screen |

### SP-7 — Scorecard

| Req ID | Requirement |
|---|---|
| SP7-01 | Vendor sees their own `vendor_scorecard` — on-time %, first-pass %, rejection count, NCR count |
| SP7-02 | Scorecard is calculated periodically (monthly) by a background job — not computed live |
| SP7-03 | Vendor cannot see any other vendor's scorecard |

---

## 7. Functional Requirements — Admin / Internal Management Module

The vendor-facing modules (SP-1 to SP-7) need a counterpart on the internal side. Without this, there is no way for staff to actually onboard a vendor onto the portal, resolve a dispute, or review a CAR. This module is gated by role using the existing `login_users.role_code` column — no separate permission table is introduced in Phase 1.

| Role Code | Persona | Access |
|---|---|---|
| `ADMIN` | System Admin | Full access to every admin endpoint below |
| `PURCHASE_MANAGER` | Purchase Manager | Vendor access management, PO/ASN oversight, dispute resolution |
| `QA_MANAGER` | Store/QC Team | Rejection reason master, CAR review |

### AD-1 — Vendor Access Management

| Req ID | Requirement |
|---|---|
| AD1-01 | Admin can enable portal access for a vendor — sets `portal_enabled = TRUE` and `portal_username` |
| AD1-02 | Admin can disable portal access at any time — sets `portal_enabled = FALSE`; any active session is invalidated immediately |
| AD1-03 | Admin can force-logout a vendor's active session (lost device, offboarding, suspected compromise) |
| AD1-04 | Admin can view a vendor's OTP request history (`vendor_otp_log`) for support troubleshooting |
| AD1-05 | Disabling portal access does not delete any history — `vendor_portal_log`, `vendor_otp_log`, and `vendor_portal_action_log` rows are retained |

### AD-2 — Rejection Reason Master Management

| Req ID | Requirement |
|---|---|
| AD2-01 | QA Manager can create/edit/deactivate rows in `rejection_reason_master` |
| AD2-02 | A reason code already used on an existing `rejection_log` row cannot be hard-deleted — only deactivated (`is_active = FALSE`) |

### AD-3 — Dispute Resolution

| Req ID | Requirement |
|---|---|
| AD3-01 | Admin sees a queue of all `OPEN` rows in `vendor_dispute_log`, sorted by `raised_at` |
| AD3-02 | Admin resolves a dispute by setting `status` (`UPHELD` / `REVISED` / `CLOSED`), `resolution_note`, `resolved_by`, `resolved_at` |
| AD3-03 | Resolving a dispute on an NCR updates the parent `ncr_log.status` accordingly (e.g., `ESCALATED` → `RESOLVED`) |

### AD-4 — CAR Review

| Req ID | Requirement |
|---|---|
| AD4-01 | QA Manager sees all NCRs with `status = CAR_SUBMITTED` |
| AD4-02 | QA Manager can accept a CAR → `ncr_log.status = CAR_ACCEPTED`, `resolved_by`, `resolved_at` set |
| AD4-03 | QA Manager can reject a CAR with a note → `ncr_log.status = CAR_REVISION_REQUESTED`; vendor is notified to resubmit |

### AD-5 — Audit & Notification Visibility

| Req ID | Requirement |
|---|---|
| AD5-01 | Admin can view `vendor_portal_action_log` filtered by vendor, date range, and action type (read-only — table is immutable at the DB level) |
| AD5-02 | Admin can view `notification_log` to check OTP/alert delivery failures |
| AD5-03 | Every admin action listed above is itself logged to a new immutable `vendor_portal_admin_action_log` table (Section 8.7) |

### AD-6 — Scorecard Oversight

| Req ID | Requirement |
|---|---|
| AD6-01 | Admin can manually trigger scorecard recalculation for a vendor/period, in addition to the monthly cron |
| AD6-02 | Admin can review a `vendor_scorecard` row and correct it before it becomes visible to the vendor (e.g., a miscounted batch) |

---

## 8. Database Design — Required Additions

All DDL below follows the exact style of the existing `schema.sql`:
`CREATE TABLE IF NOT EXISTS`, `UUID NOT NULL` primary keys with no DB-level default, `TIMESTAMP WITH TIME ZONE` columns left nullable unless explicitly required, `BOOLEAN NOT NULL` for required flags.

### 8.1 Alter Existing Tables

```sql
ALTER TABLE vendor_master ADD COLUMN vendor_code VARCHAR(30);
ALTER TABLE vendor_master ADD COLUMN portal_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vendor_master ADD COLUMN portal_username VARCHAR(100);

ALTER TABLE vendor_master ADD CONSTRAINT uq_vendor_master_vendor_code UNIQUE (vendor_code);
ALTER TABLE vendor_master ADD CONSTRAINT uq_vendor_master_portal_username UNIQUE (portal_username);
```

### 8.2 Prerequisite — Internal Staff Table

If `login_users` does not already exist elsewhere in the broader system, add a minimal version — several new tables below reference an internal staff user for `created_by` / `resolved_by` / `issued_by`:

```sql
CREATE TABLE IF NOT EXISTS login_users (
	user_id UUID NOT NULL,
	employee_code VARCHAR(30),
	name VARCHAR(255) NOT NULL,
	mobile VARCHAR(20),
	email VARCHAR(255),
	password_hash VARCHAR(255) NOT NULL,
	role_code VARCHAR(20),
	is_active BOOLEAN NOT NULL,
	last_login_at TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE,
	updated_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (user_id)
);
```

> Skip this table if it already exists in your main shared schema — just point the FKs below at the existing one.

### 8.3 New Tables — Authentication

```sql
CREATE TABLE IF NOT EXISTS vendor_portal_log (
	log_id UUID NOT NULL,
	vendor_id UUID NOT NULL,
	session_token VARCHAR(128) NOT NULL,
	otp_verified BOOLEAN NOT NULL,
	ip_address VARCHAR(50),
	device_info TEXT,
	issued_at TIMESTAMP WITH TIME ZONE,
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
	invalidated_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (log_id),
	UNIQUE (session_token),
	FOREIGN KEY(vendor_id) REFERENCES vendor_master (vendor_id)
);

CREATE TABLE IF NOT EXISTS vendor_otp_log (
	otp_id UUID NOT NULL,
	vendor_id UUID NOT NULL,
	otp_code VARCHAR(10) NOT NULL,
	channel VARCHAR(20) NOT NULL,
	is_used BOOLEAN NOT NULL,
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (otp_id),
	FOREIGN KEY(vendor_id) REFERENCES vendor_master (vendor_id)
);
```

### 8.4 New Tables — PO Tracking, ASN, Dispatch

```sql
CREATE TABLE IF NOT EXISTS po_tracking_log (
	tracking_id UUID NOT NULL,
	po_id UUID NOT NULL,
	event_type VARCHAR(30) NOT NULL,
	event_notes TEXT,
	tracking_ref VARCHAR(100),
	recorded_by UUID,
	event_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (tracking_id),
	FOREIGN KEY(po_id) REFERENCES rm_purchase_order (po_id),
	FOREIGN KEY(recorded_by) REFERENCES login_users (user_id)
);

CREATE TABLE IF NOT EXISTS asn_log (
	asn_id UUID NOT NULL,
	asn_number VARCHAR(50) NOT NULL,
	po_id UUID NOT NULL,
	vendor_id UUID NOT NULL,
	status VARCHAR(20) NOT NULL,
	expected_date DATE NOT NULL,
	arrival_window VARCHAR(30),
	vehicle_number VARCHAR(50),
	driver_name VARCHAR(100),
	submitted_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (asn_id),
	UNIQUE (asn_number),
	FOREIGN KEY(po_id) REFERENCES rm_purchase_order (po_id),
	FOREIGN KEY(vendor_id) REFERENCES vendor_master (vendor_id)
);

CREATE TABLE IF NOT EXISTS asn_detail (
	asn_detail_id UUID NOT NULL,
	asn_id UUID NOT NULL,
	po_detail_id UUID,
	rm_id UUID NOT NULL,
	qty_shipped NUMERIC(14, 3) NOT NULL,
	vendor_batch_ref VARCHAR(50),
	PRIMARY KEY (asn_detail_id),
	FOREIGN KEY(asn_id) REFERENCES asn_log (asn_id),
	FOREIGN KEY(po_detail_id) REFERENCES rm_purchase_order_detail (po_detail_id),
	FOREIGN KEY(rm_id) REFERENCES rm_master (rm_id)
);
```

### 8.5 New Tables — Rejection / NCR / Debit Note

```sql
CREATE TABLE IF NOT EXISTS rejection_reason_master (
	reason_id UUID NOT NULL,
	reason_code VARCHAR(50) NOT NULL,
	reason_label VARCHAR(150) NOT NULL,
	is_active BOOLEAN NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (reason_id),
	UNIQUE (reason_code)
);

CREATE TABLE IF NOT EXISTS rejection_log (
	rejection_id UUID NOT NULL,
	rejection_number VARCHAR(80) NOT NULL,
	grn_id UUID,
	vendor_id UUID NOT NULL,
	reason_id UUID,
	description TEXT,
	status VARCHAR(35) NOT NULL,
	return_option VARCHAR(25),
	total_qty NUMERIC(14, 3),
	disposition_deadline TIMESTAMP WITH TIME ZONE,
	notified_at TIMESTAMP WITH TIME ZONE,
	vendor_response VARCHAR(20),
	vendor_responded_at TIMESTAMP WITH TIME ZONE,
	resolved_at TIMESTAMP WITH TIME ZONE,
	created_by UUID,
	created_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (rejection_id),
	UNIQUE (rejection_number),
	FOREIGN KEY(grn_id) REFERENCES rm_receiving_log (grn_id),
	FOREIGN KEY(vendor_id) REFERENCES vendor_master (vendor_id),
	FOREIGN KEY(reason_id) REFERENCES rejection_reason_master (reason_id),
	FOREIGN KEY(created_by) REFERENCES login_users (user_id)
);

CREATE TABLE IF NOT EXISTS rejection_log_detail (
	rejection_detail_id UUID NOT NULL,
	rejection_id UUID NOT NULL,
	grn_detail_id UUID,
	rm_id UUID NOT NULL,
	qty NUMERIC(14, 3) NOT NULL,
	defect_note TEXT,
	PRIMARY KEY (rejection_detail_id),
	FOREIGN KEY(rejection_id) REFERENCES rejection_log (rejection_id),
	FOREIGN KEY(grn_detail_id) REFERENCES grn_detail (grn_detail_id),
	FOREIGN KEY(rm_id) REFERENCES rm_master (rm_id)
);

CREATE TABLE IF NOT EXISTS rejection_photo (
	photo_id UUID NOT NULL,
	rejection_id UUID NOT NULL,
	file_path VARCHAR(500) NOT NULL,
	uploaded_by UUID,
	uploaded_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (photo_id),
	FOREIGN KEY(rejection_id) REFERENCES rejection_log (rejection_id),
	FOREIGN KEY(uploaded_by) REFERENCES login_users (user_id)
);

CREATE TABLE IF NOT EXISTS ncr_log (
	ncr_id UUID NOT NULL,
	ncr_number VARCHAR(100) NOT NULL,
	rejection_id UUID,
	vendor_id UUID NOT NULL,
	defect_description TEXT NOT NULL,
	disposition_code VARCHAR(30),
	status VARCHAR(30) NOT NULL,
	acknowledgement_due TIMESTAMP WITH TIME ZONE,
	car_due TIMESTAMP WITH TIME ZONE,
	car_submitted_at TIMESTAMP WITH TIME ZONE,
	car_root_cause TEXT,
	car_corrective_action TEXT,
	raised_by UUID,
	resolved_by UUID,
	resolution_note TEXT,
	resolved_at TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (ncr_id),
	UNIQUE (ncr_number),
	FOREIGN KEY(rejection_id) REFERENCES rejection_log (rejection_id),
	FOREIGN KEY(vendor_id) REFERENCES vendor_master (vendor_id),
	FOREIGN KEY(raised_by) REFERENCES login_users (user_id),
	FOREIGN KEY(resolved_by) REFERENCES login_users (user_id)
);

CREATE TABLE IF NOT EXISTS debit_note (
	debit_note_id UUID NOT NULL,
	debit_note_number VARCHAR(80) NOT NULL,
	vendor_id UUID NOT NULL,
	rejection_id UUID,
	reason_type VARCHAR(25) NOT NULL,
	description TEXT,
	debit_amount NUMERIC(14, 2) NOT NULL,
	gst_amount NUMERIC(12, 2),
	total_amount NUMERIC(14, 2),
	status VARCHAR(25) NOT NULL,
	issued_by UUID,
	issued_at TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (debit_note_id),
	UNIQUE (debit_note_number),
	FOREIGN KEY(vendor_id) REFERENCES vendor_master (vendor_id),
	FOREIGN KEY(rejection_id) REFERENCES rejection_log (rejection_id),
	FOREIGN KEY(issued_by) REFERENCES login_users (user_id)
);

CREATE TABLE IF NOT EXISTS vendor_dispute_log (
	dispute_id UUID NOT NULL,
	vendor_id UUID NOT NULL,
	ncr_id UUID,
	grn_id UUID,
	dispute_type VARCHAR(40) NOT NULL,
	description TEXT NOT NULL,
	status VARCHAR(10) NOT NULL,
	resolved_by UUID,
	resolution_note TEXT,
	raised_at TIMESTAMP WITH TIME ZONE,
	resolved_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (dispute_id),
	FOREIGN KEY(vendor_id) REFERENCES vendor_master (vendor_id),
	FOREIGN KEY(ncr_id) REFERENCES ncr_log (ncr_id),
	FOREIGN KEY(grn_id) REFERENCES rm_receiving_log (grn_id),
	FOREIGN KEY(resolved_by) REFERENCES login_users (user_id)
);
```

### 8.6 New Tables — Scorecard, Documents, Notifications, Audit

```sql
CREATE TABLE IF NOT EXISTS vendor_scorecard (
	scorecard_id UUID NOT NULL,
	vendor_id UUID NOT NULL,
	period_start DATE NOT NULL,
	period_end DATE NOT NULL,
	deliveries_total INTEGER NOT NULL,
	deliveries_on_time INTEGER NOT NULL,
	batches_total INTEGER NOT NULL,
	batches_first_pass INTEGER NOT NULL,
	rejection_count INTEGER NOT NULL,
	ncr_count INTEGER NOT NULL,
	avg_lead_time_days NUMERIC(8, 2),
	on_time_pct NUMERIC(8, 2),
	first_pass_pct NUMERIC(8, 2),
	calculated_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (scorecard_id),
	UNIQUE (vendor_id, period_start, period_end),
	FOREIGN KEY(vendor_id) REFERENCES vendor_master (vendor_id)
);

CREATE TABLE IF NOT EXISTS inspection_document (
	document_id UUID NOT NULL,
	entity_type VARCHAR(50) NOT NULL,
	entity_id UUID NOT NULL,
	doc_type VARCHAR(30) NOT NULL,
	file_path VARCHAR(500) NOT NULL,
	uploaded_by_vendor_id UUID,
	uploaded_by_user_id UUID,
	uploaded_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (document_id),
	FOREIGN KEY(uploaded_by_vendor_id) REFERENCES vendor_master (vendor_id),
	FOREIGN KEY(uploaded_by_user_id) REFERENCES login_users (user_id)
);

CREATE TABLE IF NOT EXISTS notification_log (
	notification_id UUID NOT NULL,
	recipient_type VARCHAR(20) NOT NULL,
	recipient_id UUID NOT NULL,
	channel VARCHAR(20) NOT NULL,
	category VARCHAR(30) NOT NULL,
	title VARCHAR(200),
	message TEXT NOT NULL,
	entity_type VARCHAR(50),
	entity_id UUID,
	status VARCHAR(20) NOT NULL,
	sent_at TIMESTAMP WITH TIME ZONE,
	read_at TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (notification_id)
);

CREATE TABLE IF NOT EXISTS vendor_portal_action_log (
	action_id UUID NOT NULL,
	vendor_id UUID NOT NULL,
	session_id UUID,
	action_type VARCHAR(30) NOT NULL,
	entity_type VARCHAR(30),
	entity_id UUID,
	details JSONB,
	performed_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (action_id),
	FOREIGN KEY(vendor_id) REFERENCES vendor_master (vendor_id),
	FOREIGN KEY(session_id) REFERENCES vendor_portal_log (log_id)
);
```

> **`vendor_portal_action_log` must be immutable.** Add a trigger that blocks `UPDATE`/`DELETE` on this table — every vendor action is a permanent record used for dispute resolution.

```sql
CREATE OR REPLACE FUNCTION fn_block_immutable() RETURNS TRIGGER AS $$
BEGIN
	RAISE EXCEPTION 'This table is immutable. % is not permitted on %', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vendor_portal_action_log_immutable
	BEFORE UPDATE OR DELETE ON vendor_portal_action_log
	FOR EACH ROW EXECUTE FUNCTION fn_block_immutable();
```

### 8.7 New Table — Admin Action Log

Mirrors `vendor_portal_action_log` but for internal staff actions on the admin module. Kept as a separate table — rather than merged into one generic log — so vendor actions and staff actions never sit in the same audit trail. This matters when an auditor specifically needs "what did Astute staff do" versus "what did the vendor do."

```sql
CREATE TABLE IF NOT EXISTS vendor_portal_admin_action_log (
	admin_action_id UUID NOT NULL,
	user_id UUID NOT NULL,
	action_type VARCHAR(40) NOT NULL,
	entity_type VARCHAR(30),
	entity_id UUID,
	details JSONB,
	performed_at TIMESTAMP WITH TIME ZONE,
	PRIMARY KEY (admin_action_id),
	FOREIGN KEY(user_id) REFERENCES login_users (user_id)
);

CREATE TRIGGER trg_vendor_portal_admin_action_log_immutable
	BEFORE UPDATE OR DELETE ON vendor_portal_admin_action_log
	FOR EACH ROW EXECUTE FUNCTION fn_block_immutable();
```

`action_type` values: `ENABLE_PORTAL_ACCESS`, `DISABLE_PORTAL_ACCESS`, `FORCE_LOGOUT`, `ADD_REJECTION_REASON`, `RESOLVE_DISPUTE`, `ACCEPT_CAR`, `REQUEST_CAR_REVISION`, `RECALCULATE_SCORECARD`, `OVERRIDE_SCORECARD`.

> Reuses the `fn_block_immutable()` function already defined for `vendor_portal_action_log` — no need to redefine it.

### 8.8 Table Summary

| New Table | Purpose | Module |
|---|---|---|
| `login_users` | Internal staff (prerequisite if not already present) | All |
| `vendor_portal_log` | Vendor login sessions | SP-1 |
| `vendor_otp_log` | OTP request/verify trail + rate limiting | SP-1 |
| `po_tracking_log` | PO lifecycle events (sent → acknowledged → dispatched → received) | SP-2, SP-3, SP-4 |
| `asn_log` | Advance Shipment Notice header | SP-3 |
| `asn_detail` | ASN line items | SP-3 |
| `rejection_reason_master` | Lookup of rejection reasons | SP-5 |
| `rejection_log` | Rejection lot header | SP-5 |
| `rejection_log_detail` | Rejection line items | SP-5 |
| `rejection_photo` | QC-uploaded photos of defects | SP-5 |
| `ncr_log` | Non-Conformance Reports + CAR | SP-5 |
| `debit_note` | Financial deduction against vendor | SP-5 |
| `vendor_dispute_log` | Vendor disputes on rejection/NCR | SP-5 |
| `vendor_scorecard` | Periodic vendor performance metrics | SP-7 |
| `inspection_document` | Uploaded files (challan, cert, etc.) | SP-6 |
| `notification_log` | OTP + alert delivery record | SP-1, SP-5 |
| `vendor_portal_action_log` | Immutable audit of every vendor action | All |
| `vendor_portal_admin_action_log` | Immutable audit of every internal staff action on the admin module | Admin |

---

## 9. SQLAlchemy 2.0 ORM Models

Models use the **typed declarative style** (`Mapped` / `mapped_column`). UUID primary keys are generated in Python via `uuid.uuid4`, matching the existing schema's convention of no DB-level UUID default.

```python
# app/db/base.py
import uuid
from datetime import datetime, date
from sqlalchemy import ForeignKey, String, Boolean, Text, Numeric, Date, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


def uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
```

```python
# app/db/models/vendor_portal.py
import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, String, Boolean, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class VendorPortalLog(Base):
    __tablename__ = "vendor_portal_log"

    log_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vendor_master.vendor_id"), nullable=False
    )
    session_token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    otp_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    device_info: Mapped[str | None] = mapped_column(Text, nullable=True)
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    invalidated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class VendorOTPLog(Base):
    __tablename__ = "vendor_otp_log"

    otp_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vendor_master.vendor_id"), nullable=False)
    otp_code: Mapped[str] = mapped_column(String(10), nullable=False)
    channel: Mapped[str] = mapped_column(String(20), nullable=False)        # SMS | EMAIL
    is_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class VendorPortalActionLog(Base):
    __tablename__ = "vendor_portal_action_log"

    action_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vendor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vendor_master.vendor_id"), nullable=False)
    session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("vendor_portal_log.log_id"))
    action_type: Mapped[str] = mapped_column(String(30), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(30))
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    details: Mapped[dict | None] = mapped_column(JSON)
    performed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
```

```python
# app/db/models/asn.py
import uuid
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import ForeignKey, String, Date, Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class ASNLog(Base):
    __tablename__ = "asn_log"

    asn_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asn_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    po_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rm_purchase_order.po_id"), nullable=False)
    vendor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vendor_master.vendor_id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="SUBMITTED")
    expected_date: Mapped[date] = mapped_column(Date, nullable=False)
    arrival_window: Mapped[str | None] = mapped_column(String(30))
    vehicle_number: Mapped[str | None] = mapped_column(String(50))
    driver_name: Mapped[str | None] = mapped_column(String(100))
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class ASNDetail(Base):
    __tablename__ = "asn_detail"

    asn_detail_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asn_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("asn_log.asn_id"), nullable=False)
    po_detail_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("rm_purchase_order_detail.po_detail_id"))
    rm_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rm_master.rm_id"), nullable=False)
    qty_shipped: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    vendor_batch_ref: Mapped[str | None] = mapped_column(String(50))
```

```python
# app/db/models/rejection.py
import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import ForeignKey, String, Text, Numeric, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class RejectionLog(Base):
    __tablename__ = "rejection_log"

    rejection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rejection_number: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    grn_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("rm_receiving_log.grn_id"))
    vendor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("vendor_master.vendor_id"), nullable=False)
    reason_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("rejection_reason_master.reason_id"))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(35), nullable=False, default="QUARANTINE_HOLD")
    return_option: Mapped[str | None] = mapped_column(String(25))
    total_qty: Mapped[Decimal | None] = mapped_column(Numeric(14, 3))
    disposition_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    vendor_response: Mapped[str | None] = mapped_column(String(20))
    vendor_responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("login_users.user_id"))
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
```

> Remaining models (`POTrackingLog`, `RejectionLogDetail`, `RejectionPhoto`, `NCRLog`, `DebitNote`, `VendorDisputeLog`, `VendorScorecard`, `InspectionDocument`, `NotificationLog`) follow the identical pattern — one column per DDL field, FK via `ForeignKey("table.column")`, nullable fields use `| None`.

Also extend the existing `VendorMaster` model with the new columns:

```python
# app/db/models/vendor.py  (add to existing class)
class VendorMaster(Base):
    __tablename__ = "vendor_master"
    # ... existing columns ...
    vendor_code: Mapped[str | None] = mapped_column(String(30), unique=True)
    portal_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    portal_username: Mapped[str | None] = mapped_column(String(100), unique=True)
```

The admin-side audit table follows the identical pattern:

```python
# app/db/models/admin_action.py
import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, String, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class VendorPortalAdminActionLog(Base):
    __tablename__ = "vendor_portal_admin_action_log"

    admin_action_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("login_users.user_id"), nullable=False)
    action_type: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(30))
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    details: Mapped[dict | None] = mapped_column(JSONB)
    performed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
```

---

## 10. Alembic Migration Plan

### 10.1 Setup (if not already initialized)

```bash
pip install alembic
alembic init alembic
```

In `alembic/env.py`, point `target_metadata` at your `Base.metadata` so `--autogenerate` works:

```python
from app.db.base import Base
target_metadata = Base.metadata
```

### 10.2 Migration Sequence

Run migrations in this order — later tables have FKs into earlier ones:

| Order | Revision | Tables Created |
|---|---|---|
| 1 | `0001_vendor_portal_columns` | ALTER `vendor_master` (add `vendor_code`, `portal_enabled`, `portal_username`) |
| 2 | `0002_login_users` | `login_users` (skip if it already exists) |
| 3 | `0003_vendor_auth_tables` | `vendor_portal_log`, `vendor_otp_log` |
| 4 | `0004_po_tracking_asn` | `po_tracking_log`, `asn_log`, `asn_detail` |
| 5 | `0005_rejection_ncr` | `rejection_reason_master`, `rejection_log`, `rejection_log_detail`, `rejection_photo`, `ncr_log`, `debit_note`, `vendor_dispute_log` |
| 6 | `0006_scorecard_docs_notify` | `vendor_scorecard`, `inspection_document`, `notification_log` |
| 7 | `0007_action_log_immutable` | `vendor_portal_action_log` + immutability trigger |
| 8 | `0008_admin_action_log` | `vendor_portal_admin_action_log` + immutability trigger |

### 10.3 Example Migration — Revision 0001

```bash
alembic revision -m "vendor_portal_columns"
```

```python
"""vendor_portal_columns

Revision ID: 0001
Revises:
Create Date: 2026-06-20
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("vendor_master", sa.Column("vendor_code", sa.String(30), nullable=True))
    op.add_column("vendor_master", sa.Column("portal_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("vendor_master", sa.Column("portal_username", sa.String(100), nullable=True))
    op.create_unique_constraint("uq_vendor_master_vendor_code", "vendor_master", ["vendor_code"])
    op.create_unique_constraint("uq_vendor_master_portal_username", "vendor_master", ["portal_username"])


def downgrade() -> None:
    op.drop_constraint("uq_vendor_master_portal_username", "vendor_master", type_="unique")
    op.drop_constraint("uq_vendor_master_vendor_code", "vendor_master", type_="unique")
    op.drop_column("vendor_master", "portal_username")
    op.drop_column("vendor_master", "portal_enabled")
    op.drop_column("vendor_master", "vendor_code")
```

### 10.4 Example Migration — Revision 0003 (auth tables)

```python
"""vendor_auth_tables

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vendor_portal_log",
        sa.Column("log_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("vendor_master.vendor_id"), nullable=False),
        sa.Column("session_token", sa.String(128), nullable=False, unique=True),
        sa.Column("otp_verified", sa.Boolean(), nullable=False),
        sa.Column("ip_address", sa.String(50)),
        sa.Column("device_info", sa.Text()),
        sa.Column("issued_at", sa.DateTime(timezone=True)),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("invalidated_at", sa.DateTime(timezone=True)),
    )
    op.create_table(
        "vendor_otp_log",
        sa.Column("otp_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("vendor_master.vendor_id"), nullable=False),
        sa.Column("otp_code", sa.String(10), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("is_used", sa.Boolean(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    op.drop_table("vendor_otp_log")
    op.drop_table("vendor_portal_log")
```

### 10.5 Example Migration — Revision 0007 (immutable audit table)

```python
"""action_log_immutable

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vendor_portal_action_log",
        sa.Column("action_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("vendor_master.vendor_id"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("vendor_portal_log.log_id")),
        sa.Column("action_type", sa.String(30), nullable=False),
        sa.Column("entity_type", sa.String(30)),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True)),
        sa.Column("details", postgresql.JSONB()),
        sa.Column("performed_at", sa.DateTime(timezone=True)),
    )

    op.execute("""
        CREATE OR REPLACE FUNCTION fn_block_immutable() RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION 'This table is immutable. % is not permitted on %', TG_OP, TG_TABLE_NAME;
        END;
        $$ LANGUAGE plpgsql;
    """)
    op.execute("""
        CREATE TRIGGER trg_vendor_portal_action_log_immutable
        BEFORE UPDATE OR DELETE ON vendor_portal_action_log
        FOR EACH ROW EXECUTE FUNCTION fn_block_immutable();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_vendor_portal_action_log_immutable ON vendor_portal_action_log")
    op.drop_table("vendor_portal_action_log")
```

### 10.6 Example Migration — Revision 0008 (admin action log)

```python
"""admin_action_log

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vendor_portal_admin_action_log",
        sa.Column("admin_action_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("login_users.user_id"), nullable=False),
        sa.Column("action_type", sa.String(40), nullable=False),
        sa.Column("entity_type", sa.String(30)),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True)),
        sa.Column("details", postgresql.JSONB()),
        sa.Column("performed_at", sa.DateTime(timezone=True)),
    )
    op.execute("""
        CREATE TRIGGER trg_vendor_portal_admin_action_log_immutable
        BEFORE UPDATE OR DELETE ON vendor_portal_admin_action_log
        FOR EACH ROW EXECUTE FUNCTION fn_block_immutable();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_vendor_portal_admin_action_log_immutable ON vendor_portal_admin_action_log")
    op.drop_table("vendor_portal_admin_action_log")
```

> Reuses `fn_block_immutable()` created in revision `0007` — no need to redefine the function.

### 10.7 Running Migrations

```bash
alembic upgrade head        # apply all pending migrations
alembic downgrade -1        # roll back one revision
alembic current             # show current DB revision
alembic history              # list all revisions
```

---

## 11. API Design (FastAPI)

All portal routes are under `/api/v1/portal/` and protected by a `portal_auth_guard` dependency — distinct from the internal staff auth guard.

### 11.1 Pydantic Schemas (request/response)

```python
# app/schemas/portal_auth.py
from pydantic import BaseModel, Field


class OTPRequestIn(BaseModel):
    portal_username: str = Field(..., description="Vendor's registered mobile or email")


class OTPVerifyIn(BaseModel):
    portal_username: str
    otp_code: str = Field(..., min_length=6, max_length=6)


class PortalTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: str
```

```python
# app/schemas/po.py
from pydantic import BaseModel
from decimal import Decimal
from datetime import date
from uuid import UUID


class POLineOut(BaseModel):
    po_detail_id: UUID
    rm_id: UUID
    order_qty: Decimal
    received_qty: Decimal | None
    unit_price: Decimal
    line_amount: Decimal | None
    line_status: str | None


class PurchaseOrderOut(BaseModel):
    po_id: UUID
    po_number: str
    order_date: date
    expected_delivery_date: date | None
    total_amount: Decimal | None
    status_name: str
    lines: list[POLineOut]


class PODeclineIn(BaseModel):
    reason: str
```

```python
# app/schemas/asn.py
from pydantic import BaseModel
from decimal import Decimal
from datetime import date
from uuid import UUID


class ASNLineIn(BaseModel):
    po_detail_id: UUID
    rm_id: UUID
    qty_shipped: Decimal
    vendor_batch_ref: str | None = None


class ASNCreateIn(BaseModel):
    po_id: UUID
    expected_date: date
    vehicle_number: str
    driver_name: str
    arrival_window: str | None = None
    lines: list[ASNLineIn]
```

### 11.2 Endpoint List

| Method | Path | Module | Description |
|---|---|---|---|
| `POST` | `/portal/auth/otp-request` | SP-1 | Send OTP to vendor |
| `POST` | `/portal/auth/otp-verify` | SP-1 | Verify OTP, create session, issue JWT |
| `POST` | `/portal/auth/logout` | SP-1 | Invalidate session |
| `GET` | `/portal/purchase-orders` | SP-2 | List vendor's POs |
| `GET` | `/portal/purchase-orders/{po_id}` | SP-2 | PO detail with lines |
| `POST` | `/portal/purchase-orders/{po_id}/acknowledge` | SP-2 | Acknowledge PO |
| `POST` | `/portal/purchase-orders/{po_id}/decline` | SP-2 | Decline PO with reason |
| `GET` | `/portal/asns` | SP-3 | List vendor's ASNs |
| `POST` | `/portal/asns` | SP-3 | Submit new ASN |
| `POST` | `/portal/asns/{asn_id}/confirm-dispatch` | SP-4 | Confirm physical dispatch |
| `GET` | `/portal/grns` | SP-2/4 | List GRNs raised against vendor's POs |
| `GET` | `/portal/grns/{grn_id}` | SP-2/4 | GRN detail with batch lines |
| `GET` | `/portal/rejections` | SP-5 | List rejections |
| `GET` | `/portal/rejections/{rejection_id}` | SP-5 | Rejection detail + photos |
| `POST` | `/portal/rejections/{rejection_id}/acknowledge` | SP-5 | Respond to rejection |
| `GET` | `/portal/ncrs/{ncr_id}` | SP-5 | NCR detail |
| `POST` | `/portal/ncrs/{ncr_id}/submit-car` | SP-5 | Submit Corrective Action Report |
| `POST` | `/portal/disputes` | SP-5 | Raise a dispute |
| `POST` | `/portal/documents/upload` | SP-6 | Upload a document |
| `GET` | `/portal/documents` | SP-6 | List uploaded documents |
| `GET` | `/portal/scorecard` | SP-7 | View own scorecard |

### 11.3 Auth Guard (FastAPI dependency)

```python
# app/api/deps.py
from datetime import datetime
from uuid import UUID
import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models.vendor_portal import VendorPortalLog
from app.core.config import settings


async def portal_auth_guard(request: Request, db: Session = Depends(get_db)) -> UUID:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Missing token")

    token = auth_header.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, settings.JWT_PUBLIC_KEY, algorithms=["RS256"])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

    if payload.get("sub_type") != "vendor":
        raise HTTPException(403, "Not a vendor token")

    session = (
        db.query(VendorPortalLog)
        .filter(
            VendorPortalLog.session_token == payload["session_id"],
            VendorPortalLog.otp_verified.is_(True),
            VendorPortalLog.expires_at > datetime.utcnow(),
            VendorPortalLog.invalidated_at.is_(None),
        )
        .first()
    )
    if not session:
        raise HTTPException(401, "Session expired or invalid")

    request.state.vendor_id = UUID(payload["sub"])
    request.state.session_id = session.log_id
    return request.state.vendor_id
```

### 11.4 Example Route — PO Acknowledge

```python
# app/api/routes/portal_po.py
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import portal_auth_guard
from app.db.session import get_db
from app.db.models.po import RMPurchaseOrder
from app.db.models.vendor_portal import VendorPortalActionLog
from app.db.models.po_tracking import POTrackingLog

router = APIRouter(prefix="/portal/purchase-orders", tags=["portal-po"])


@router.post("/{po_id}/acknowledge")
def acknowledge_po(
    po_id: UUID,
    db: Session = Depends(get_db),
    vendor_id: UUID = Depends(portal_auth_guard),
):
    po = (
        db.query(RMPurchaseOrder)
        .filter(RMPurchaseOrder.po_id == po_id, RMPurchaseOrder.vendor_id == vendor_id)
        .first()
    )
    if not po:
        raise HTTPException(404, "PO not found")           # vendor isolation — 404, not 403

    if po.status_id == ACKNOWLEDGED_STATUS_ID:
        raise HTTPException(409, "PO already acknowledged")

    po.status_id = ACKNOWLEDGED_STATUS_ID

    db.add(POTrackingLog(po_id=po.po_id, event_type="VENDOR_ACKNOWLEDGED"))
    db.add(VendorPortalActionLog(
        vendor_id=vendor_id,
        action_type="PO_ACKNOWLEDGE",
        entity_type="PO",
        entity_id=po.po_id,
    ))
    db.commit()
    return {"status": "acknowledged"}
```

> **Note the `404` instead of `403`** when the PO doesn't belong to the vendor — this avoids confirming that a PO ID exists at all to someone probing with another vendor's PO ID.

### 11.5 Admin Pydantic Schemas

```python
# app/schemas/admin.py
from pydantic import BaseModel


class VendorEnablePortalIn(BaseModel):
    portal_username: str


class DisputeResolveIn(BaseModel):
    status: str          # UPHELD | REVISED | CLOSED
    resolution_note: str


class CARDecisionIn(BaseModel):
    note: str | None = None
```

### 11.6 Admin Endpoint List

| Method | Path | Module | Description |
|---|---|---|---|
| `POST` | `/admin/vendor-portal/vendors/{vendor_id}/enable` | AD-1 | Enable portal access, set portal_username |
| `POST` | `/admin/vendor-portal/vendors/{vendor_id}/disable` | AD-1 | Disable portal access |
| `POST` | `/admin/vendor-portal/vendors/{vendor_id}/force-logout` | AD-1 | Invalidate active session |
| `GET` | `/admin/vendor-portal/vendors/{vendor_id}/otp-log` | AD-1 | View OTP request history |
| `GET` | `/admin/vendor-portal/rejection-reasons` | AD-2 | List rejection reasons |
| `POST` | `/admin/vendor-portal/rejection-reasons` | AD-2 | Create rejection reason |
| `PUT` | `/admin/vendor-portal/rejection-reasons/{reason_id}` | AD-2 | Update/deactivate reason |
| `GET` | `/admin/vendor-portal/disputes` | AD-3 | List disputes (filter by status) |
| `POST` | `/admin/vendor-portal/disputes/{dispute_id}/resolve` | AD-3 | Resolve a dispute |
| `GET` | `/admin/vendor-portal/ncrs?status=CAR_SUBMITTED` | AD-4 | List NCRs pending CAR review |
| `POST` | `/admin/vendor-portal/ncrs/{ncr_id}/car/accept` | AD-4 | Accept CAR |
| `POST` | `/admin/vendor-portal/ncrs/{ncr_id}/car/request-revision` | AD-4 | Request CAR revision |
| `GET` | `/admin/vendor-portal/action-log` | AD-5 | View vendor action audit trail |
| `GET` | `/admin/vendor-portal/notifications` | AD-5 | View notification delivery log |
| `POST` | `/admin/vendor-portal/scorecards/{vendor_id}/recalculate` | AD-6 | Trigger recalculation |
| `PUT` | `/admin/vendor-portal/scorecards/{scorecard_id}` | AD-6 | Override before publish |

### 11.7 Admin Auth Guard (Role-Based)

```python
# app/api/deps.py  (add alongside portal_auth_guard)
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models.staff import LoginUsers
import jwt
from app.core.config import settings


def require_roles(*allowed_roles: str):
    async def _guard(request: Request, db: Session = Depends(get_db)):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(401, "Missing token")

        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, settings.JWT_PUBLIC_KEY, algorithms=["RS256"])
        except jwt.InvalidTokenError:
            raise HTTPException(401, "Invalid token")

        if payload.get("sub_type") != "staff":
            raise HTTPException(403, "Not a staff token")

        user = db.query(LoginUsers).filter(LoginUsers.user_id == payload["sub"]).first()
        if not user or not user.is_active:
            raise HTTPException(401, "User inactive or not found")

        if user.role_code not in allowed_roles and user.role_code != "ADMIN":
            raise HTTPException(403, "Insufficient role")

        request.state.user_id = user.user_id
        request.state.role_code = user.role_code
        return request.state

    return _guard
```

Usage on a route: `Depends(require_roles("ADMIN", "PURCHASE_MANAGER"))`. `ADMIN` always passes — it is the superuser role.

### 11.8 Example Admin Route — Resolve Dispute

```python
# app/api/routes/admin_disputes.py
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import require_roles
from app.db.session import get_db
from app.db.models.rejection import VendorDisputeLog
from app.db.models.admin_action import VendorPortalAdminActionLog
from app.schemas.admin import DisputeResolveIn

router = APIRouter(prefix="/admin/vendor-portal/disputes", tags=["admin-vendor-portal"])


@router.post("/{dispute_id}/resolve")
def resolve_dispute(
    dispute_id: UUID,
    payload: DisputeResolveIn,
    db: Session = Depends(get_db),
    actor=Depends(require_roles("ADMIN", "PURCHASE_MANAGER")),
):
    dispute = db.query(VendorDisputeLog).filter(VendorDisputeLog.dispute_id == dispute_id).first()
    if not dispute:
        return {"error": "not found"}, 404

    dispute.status = payload.status
    dispute.resolution_note = payload.resolution_note
    dispute.resolved_by = actor.user_id
    dispute.resolved_at = datetime.utcnow()

    db.add(VendorPortalAdminActionLog(
        user_id=actor.user_id,
        action_type="RESOLVE_DISPUTE",
        entity_type="DISPUTE",
        entity_id=dispute.dispute_id,
        details={"status": payload.status},
    ))
    db.commit()
    return {"status": "resolved"}
```

---

## 12. Data Access / Isolation Rules

| Rule | Enforcement |
|---|---|
| `vendor_id` is never trusted from request body/params | Always taken from `request.state.vendor_id` (set by `portal_auth_guard` from JWT) |
| Cross-vendor PO/ASN/GRN access returns `404`, not `403` | Prevents ID enumeration / confirming existence |
| All writes are filtered by `vendor_id = :jwt_vendor_id` | Applied at the query layer in every route, not just at the UI |
| `vendor_portal_action_log` is append-only | DB trigger `fn_block_immutable()` blocks UPDATE/DELETE |
| OTP rate limiting | Max 5 `vendor_otp_log` rows per vendor per rolling hour, checked before sending a new OTP |
| Session expiry | Hard 8-hour `expires_at`; revalidated on every request |
| Admin/staff actions require a `role_code` check | Enforced via `require_roles()` dependency on every `/admin/vendor-portal/*` route |
| Vendor JWTs and staff JWTs are structurally distinct | `sub_type=vendor` vs `sub_type=staff` — neither token type works against the other's routes |
| Admin actions are also append-only logged | `vendor_portal_admin_action_log` carries the same immutability trigger as the vendor-side log |

---

## 13. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Security | JWT RS256, OTP-only auth, rate-limited OTP requests, all vendor actions logged immutably |
| Performance | PO list endpoint must respond < 500ms for vendors with up to 200 active POs |
| Auditability | Every state-changing action writes to `vendor_portal_action_log` before returning success |
| File storage | Documents/photos never stored as DB blobs — only `file_path` is persisted; actual file goes to MinIO/S3 |
| Scalability | All new tables use UUID PKs to remain consistent with the rest of the schema and avoid cross-shard collisions if scaled later |

---

## 14. Phased Rollout

| Phase | Scope |
|---|---|
| **Phase 1a** | SP-1 (Auth) + SP-2 (PO view/acknowledge) — minimum viable portal |
| **Phase 1b** | SP-3 (ASN) + SP-4 (Dispatch confirm) |
| **Phase 1c** | SP-5 (Rejection/NCR/Dispute) — most complex, needs QC team buy-in on `rejection_reason_master` seed data |
| **Phase 1d** | SP-6 (Documents) + SP-7 (Scorecard) |

**Admin module sequencing:** AD-1 (vendor access management) must ship *before* Phase 1a — vendors cannot use the portal at all until staff can enable access. AD-2 (rejection reasons) ships alongside Phase 1c so QA has seed data ready. AD-3/AD-4 (dispute/CAR review) ship alongside Phase 1c. AD-5/AD-6 (audit view, scorecard override) ship alongside Phase 1d.

**Integration test before sign-off:** Vendor logs in → sees PO → acknowledges → submits ASN → confirms dispatch → internal team creates GRN → vendor sees GRN status → QC rejects a batch → vendor sees rejection → vendor responds → debit note (if any) is visible to vendor.

---

## 15. Open Items

- [ ] Confirm OTP delivery provider (SMS gateway) — needed before Phase 1a goes live
- [ ] Confirm whether `login_users` already exists in the broader shared schema, or needs to be created fresh here
- [ ] Seed `rejection_reason_master` with the QA team's standard reason codes
- [ ] Decide MinIO vs S3 for document storage bucket naming convention
- [ ] Confirm vendor scorecard calculation cadence (monthly vs rolling 30-day window)
- [ ] Confirm whether `ADMIN` is a single catch-all role for Phase 1, or whether System Admin and Module Admin need to be distinct roles per the original Admin framework decision
