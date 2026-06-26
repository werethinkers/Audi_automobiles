# ASTUTE BRIDGE ERP — MASTER CONTEXT PROMPT
## Complete Project Brief for New Chat Session Continuity
### Version: 1.0 — Generated June 2026

---

> **HOW TO USE THIS DOCUMENT**
> Paste this entire document at the start of a new chat session.
> It contains everything Claude needs to continue this project without losing context.
> Say: *"Here is our project context. Continue from where we left off."*

---

## WHO WE ARE

**Astute Group** — Software development firm building a multi-client manufacturing ERP platform called **Astute Bridge ERP**. We are building this as a product, not a one-off project. Shared modules are built once and reused across clients. Project-specific plugins are built fresh per client.

**Working style:**
- We use Discussion Mode for major decisions — diagnose first, present options, ask max 2 questions before recommending
- Every decision gets a Decision Record (DL-001, DL-002 etc.)
- All schema follows erp_audi-38.sql legacy naming conventions (see Section 8)
- Three SQL files per deployment: shared.sql + audi.sql OR shared.sql + asesa.sql
- We are building for Indian manufacturing SMEs (₹10–200 Cr revenue)

---

## SECTION 1 — THE TWO ACTIVE PROJECTS

### Project A — ASESA Autocorp (EV Chassis Assembly)
**What they do:** Assemble Electric Vehicle chassis from ~416 BOM components across 10 assembly stations. Each chassis gets a VIN (ASESA-EV-YYYY-NNNN).

**The problem:** Everything runs on paper and WhatsApp. No digital traceability. HV part co-signs are verbal. Post-delivery defect investigation requires manual paper search.

**Scale:** ~416 BOM parts, 10 stations, 3 ECUs per chassis, 12 EOL tests, 400+ torque events per chassis, ~20-30 active users.

**Deployment:** Cloud (AWS or Azure). File storage: S3 or Azure Blob. Station agents run on Windows 10/11 PCs (Python Windows Service).

**Database:** `asesa_ev_erp` — runs shared.sql THEN asesa.sql

**Timeline:** 28 weeks total.

---

### Project B — Audi Automobiles (Bus Body Manufacturing)
**Client:** Bhagirath Brothers, Indore. Two plants:
- **Bus body plant** (this project) — builds school/staff buses on OEM chassis
- **Parts manufacturing plant** (separate, future Project C) — supplies fabricated steel parts to bus body plant AND to VECV, Tata Motors, M&M

**What they do:** Build complete bus bodies on chassis received from dealers (primarily Eicher/VECV). 16 sequential production stations. ~40+ FERT codes (bus model variants). Multiple CPQ options (AC, GPS, FAPS, door type, seating).

**The problem:** Three divergent records — gate register (paper), stock (Excel), accounts (Tally) — can never be reconciled. No real-time production visibility.

**Scale:** 16 stations, ~40 FERT variants, 9 stores, ~30-50 users, monthly procurement cycle.

**Deployment:** On-premise PostgreSQL 16 (client mandated). File storage: MinIO.

**Database:** `audi_bus_erp` — runs shared.sql THEN audi.sql

**Timeline:** 24 weeks total.

---

## SECTION 2 — ARCHITECTURE: MODE B

**MODE B = Two projects built simultaneously sharing common modules.**

```
astute-bridge-erp/
├── shared.sql          ← ALL common tables (runs on BOTH databases)
├── audi.sql            ← Audi-only plugin tables (runs on Audi DB only)
└── asesa.sql           ← ASESA-only plugin tables (runs on ASESA DB only)

Deployment:
  Audi DB:  psql audi_bus_erp  < shared.sql && psql audi_bus_erp  < audi.sql
  ASESA DB: psql asesa_ev_erp  < shared.sql && psql asesa_ev_erp  < asesa.sql
```

**What "shared" means:** Tables in shared.sql are structurally IDENTICAL in both databases. One developer change = applied to both. No divergence allowed.

**What "plugin" means:** Tables in audi.sql or asesa.sql exist only in that project's database. No cross-project references.

---

## SECTION 3 — TECH STACK (BOTH PROJECTS)

| Component | Technology |
|---|---|
| Backend | Python 3.12 + FastAPI |
| Database | PostgreSQL 16 |
| Task Queue | Celery + Redis 7 (Celery Beat for cron) |
| File Storage | AWS S3 / Azure Blob (ASESA) \| MinIO (Audi) |
| PDF Generation | WeasyPrint |
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Authentication | JWT RS256 + Redis session store |
| Station Agent (ASESA) | Python 3.12 Windows Service (pywin32, pyserial) |
| Labels | ZPL → Zebra thermal printers |
| Tally Export | Tally XML (Prime format — confirm version) |

---

## SECTION 4 — NAMING CONVENTIONS (CRITICAL — FOLLOW ALWAYS)

We follow the naming conventions of the legacy `erp_audi-38.sql` MySQL schema. This is NON-NEGOTIABLE — every new table must follow these patterns.

### Table naming patterns:
- `_master` suffix → lookup/master data (vendor_master, role_master, defect_master)
- `_log` suffix → audit/history/event records (torque_log, qa_logs, ecu_flash_log)
- `_details` suffix → line items of a header (rm_purchase_order_details, backflush_details)
- `_mapping` suffix → junction/linking tables (vendor_rm_link, rm_store_mapping, station_operator_mapping)
- `rm_` prefix → raw material specific tables (rm_purchase_order, rm_inventory, rm_consumption_log)
- `qa_` prefix → quality assurance (qa_logs, qa_incoming_log, qa_defect_log)

### Column naming:
- PK: `id` (SERIAL for ASESA plugins, UUID for everything else)
- FK: `{table}_id` (e.g., `vendor_id`, `station_id`, `chassis_id`)
- Boolean active flag: `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- Timestamps: `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Status: always VARCHAR with CHECK constraint, always has a `po_status_master` style display table

### Legacy → Our name mappings (IMPORTANT):
| Legacy / Our design name | Notes |
|---|---|
| `part_master` | What we call `item_master` in docs — in SQL it's `part_master` |
| `login_users` | What we call `user_master` in docs — in SQL it's `login_users` |
| `rm_purchase_order` | What we call `vendor_po` in docs — in SQL it's `rm_purchase_order` |
| `rm_purchase_order_details` | PO line items |
| `rm_inventory` | Stock balance table (not `inventory_balance`) |
| `rm_inventory_log` | Immutable ledger (not `inventory_ledger`) |
| `rm_consumption_log` | Consumption records |
| `rm_order_receiving_log` | GRN receiving link to PO |
| `production_logs` | Plural — follows legacy |
| `qa_logs` | Plural — follows legacy |
| `grn_log` | GRN header |
| `grn_batch` | Per-item batches within a GRN |
| `gate_log` | New gate entry (replaces `gate_entry` which is frozen historical) |
| `dispatch_notes` | Dispatch records |
| `warranty_log` | Warranty records |
| `checklist_master` | Checklist templates |
| `checklist_log` | Checklist responses |
| `rejection_log` | Rejection lot (bulk rejection grouping) |
| `machine_master` | Equipment/tool master (replaces `tool_master`) |
| `vendor_portal_action_log` | Supplier portal actions |
| `vendor_dispute_log` | Vendor disputes |
| `three_way_match_log` | 3-way match records |

### PK Convention (Decision D-11, LOCKED):
- **shared.sql tables:** UUID PRIMARY KEY DEFAULT gen_random_uuid()
- **audi.sql tables:** UUID PRIMARY KEY DEFAULT gen_random_uuid()
- **asesa.sql tables:** SERIAL PRIMARY KEY (integers)
- **FK from ASESA plugin → shared table:** UUID type column (not INTEGER)

---

## SECTION 5 — ALL LOCKED DECISIONS

### ASESA Decisions (ALL RESOLVED):
| ID | Decision |
|---|---|
| D-01 | BOM ~416 parts — not fixed, client may revise |
| D-02 | Dev parts QC checklist from ASESA QA team by Week 7 |
| D-03 | EOL thresholds from Engineering by Week 12 |
| D-04 | Torque Spec Register spreadsheet from ASESA by Week 8 |
| D-05 | Harness check = digital forms in ERP (PIN-to-PIN + Connector) |
| D-06 | Cloud deployment — AWS or Azure |
| D-07 | SMTP configured post-Phase 2d (non-blocking) |
| D-11 | Two PK conventions: ASESA plugins = SERIAL, shared = UUID |
| D-12 | Role model: `primary_role_id` NOT NULL on login_users + user_role_mapping junction (unused for ASESA) |

### Audi Decisions (ALL RESOLVED):
| ID | Decision |
|---|---|
| D-01 | OBD dongle vendor TBD — generic webhook with configurable field mapping (dongle_config table) |
| D-02 | Cycle times NULL initially — set after 3 months data collection |
| D-03 | BOM export from Engineering before Phase 1 ends (Week 7) |
| D-04 | Defect master from QA team before Phase 2b |
| D-05 | AC fitment = external vendor, Supervisor confirms |
| D-11 | **Chassis gate (34-acre yard plant) and material gate (production plant) are COMPLETELY SEPARATE.** Different physical locations. Different tables. `gate_log` NEVER receives a chassis arrival. `chassis_ledger` is for 34-acre yard arrivals only. |

### Architecture Decisions (ALL LOCKED):
| Decision | What was decided |
|---|---|
| Rejection lot | Rejection Lot is primary entity. NCR created FROM lot. One lot = one vendor notification |
| Admin framework | `/admin/*` separate section. System Admin sees all. Module Admin sees their module only |
| Gate module | `gate_entry` FROZEN (historical). New system uses `gate_log` with dynamic `gate_profile` and `gate_transaction_type_master` |
| Inventory credit | Stock only credited AFTER put-away confirmation (`put_away_task.status = COMPLETED`). QC approval creates put_away_task only |
| MIR | Material Issue Request = SHARED module (both Audi and ASESA). ASESA primary path = build order pick list. MIR = secondary (consumables, ad-hoc) |
| Station master | SHARED table in both databases. UUID PKs. Client chooses station names (not restricted to STN-01 format) |
| BOM configuration | ASESA: `bom_station_mapping` table (admin-configured). Build order lines GENERATED from it at release. Audi: `master_bom` table |
| tool_master | REMOVED. Torque guns registered in `machine_master` (shared equipment table) with calibration fields |
| Vendor email | Optional (not NOT NULL). Either email OR mobile required |

---

## SECTION 6 — SHARED.SQL TABLE LIST (80 tables)

All tables in shared.sql are present in BOTH databases. Key tables:

**Core:** `role_master`, `login_users`, `user_role_mapping`, `user_role_access`, `audit_log`, `override_log`, `notifications`, `notification_queue`, `custom_field_definition`

**Master data:** `vendor_master`, `vendor_scorecard`, `procurement_source_master`, `section_type_master`, `part_master`, `vendor_rm_link`, `bom_components`, `store_master`, `rm_store_mapping`, `grn_routing_rule`, `shift_master`, `operation_master`, `station_master`, `station_operator_mapping`, `machine_master`, `station_machine_mapping`, `maintenance_log`, `maintenance_spares_log`, `machine_recall_log`, `driver_master`, `truck_master`

**Gate:** `gate_transaction_type_master`, `gate_profile`, `gate_profile_type_mapping`, `gate_entry` (frozen), `gate_log`

**Procurement:** `po_status_master`, `rm_purchase_order`, `rm_purchase_order_details`, `po_tracking_log`

**GRN/Receiving:** `grn_log`, `grn_batch`, `rm_order_receiving_log`

**Inventory:** `rm_inventory`, `rm_inventory_log` (immutable), `put_away_task`, `rm_consumption_log`, `material_issue_request`, `material_issue_request_details`, `daily_shortage`, `demand_forecast`, `rm_planning`

**QC:** `checklist_master`, `checklist_items`, `checklist_log`, `checklist_item_log`, `qa_master`, `qa_incoming_log`, `inspection_documents`

**Rejection/NCR:** `rejection_reason_master`, `rejection_log`, `rejection_log_details`, `rejection_photos`, `rejection_lifecycle_log` (immutable), `ncr_log`, `debit_note`

**Supplier Portal:** `vendor_portal_log`, `asn_log`, `asn_details`, `vendor_portal_action_log` (immutable), `vendor_dispute_log`

**Dispatch:** `dispatch_notes`, `dispatch_documents`, `dispatch_clearance_log`, `warranty_log`, `warranty_claim_log`

**Movement:** `unit_movement_log` (immutable), `scrap_tracking`

**Admin:** `module_admin_mapping`, `module_admin_action_log` (immutable)

---

## SECTION 7 — AUDI.SQL TABLE LIST (29 tables)

Audi-specific plugin tables:

`dealer_master`, `body_type_master`, `fert_master`, `dynamic_features`, `feature_bom`, `order_details`, `customer_advance`

`station_fert_cycle_time`, `station_floor_buffer_config`

`chassis_ledger`, `yard_location_log`

`dongle_config`, `dongle_check_log`

`master_bom`, `defect_master`, `production_logs`, `qa_logs`, `qa_defect_log`

`backflush_log`, `backflush_details` + `fn_backflush_on_qa_pass()` stored procedure

`rework_log`, `rework_parts_log`, `post_dispatch_service`

`vendor_invoice`, `three_way_match_log`, `tally_export_config`, `sales_invoice`

`dealer_portal_log`, `dealer_portal_action_log` (immutable)

**Views:** `v_live_wip`, `v_fvi_straight_pass`

---

## SECTION 8 — ASESA.SQL TABLE LIST (25 tables, SERIAL PKs)

ASESA-specific plugin tables (all SERIAL integer PKs):

`bom_station_mapping`, `bom_station_mapping_version_log`

`build_order`, `build_order_details`, `stock_reservation`, `proto_bom_approval_log`

`vin_master`, `engraving_log`, `vin_label_log`

`hv_cosign_log`, `hv_cert_log`

`chassis_part_link` (immutable), `station_activity_log`, `station_clearance_log`

`harness_check_log` (immutable once submitted), `harness_check_details`

`torque_log` (immutable), `torque_nok_resolution_log`

`firmware_library`, `flash_session_log`, `ecu_flash_log` (immutable)

`eol_session`, `eol_test_log` (immutable), `eol_rework_log`

`rejection_bay_bin`

**Views:** `v_vin_build_status`, `v_torque_compliance`, `v_hv_compliance`, `v_stock_dashboard`

---

## SECTION 9 — PHASE 1 SCOPE (CURRENT PRIORITY)

**Client direction:** Phase 1 must deliver:
1. Supplier Portal (live for vendors)
2. Dealer Portal (live for dealers — Audi only)
3. Inventory management (full multi-store with put-away)
4. Purchase Orders (full cycle with GST)

**Phase 1 — 7 week breakdown:**

| Week | What gets built |
|---|---|
| 1 | Schema applied, stores seeded, master data imported from Excel |
| 2 | part_master, vendor_master, rm_vendor_mapping CRUD + custom fields API |
| 3 | rm_purchase_order full cycle with GST auto-calculation trigger |
| 4 | gate_log → grn_log → grn_batch → put_away_task → rm_inventory |
| 5 | qa_incoming_log → rejection_log → ncr_log → vendor notification |
| 6 | Supplier Portal all modules + Dealer Portal (Audi) |
| 7 | rm_consumption_log, RM Auditor audit, shortage dashboard, reports |

**Integration test (must pass before Phase 2):**
PO created → Gate Arrival → GRN → Put-Away → QC → Stock visible → Consumption → Report

---

## SECTION 10 — JSONB CUSTOM FIELDS FRAMEWORK

**Pattern used throughout:** Tables that need client-configurable fields have `custom_fields JSONB NOT NULL DEFAULT '{}'` column plus a `custom_field_definition` table that defines what fields exist.

**Tables with custom_fields JSONB:**
`part_master`, `vendor_master`, `rm_purchase_order`, `rm_purchase_order_details`, `grn_batch`, `station_master`

**How it works:**
1. Module Admin inserts row into `custom_field_definition` (entity_type, field_key, field_label, field_type)
2. Frontend calls `GET /api/v1/custom-fields/{entity_type}` → renders dynamic form fields
3. API calls `fn_validate_custom_fields(entity_type, custom_fields_jsonb)` before INSERT
4. GIN index on JSONB columns for fast querying
5. Zero code changes to add a new field — admin panel only

**field_type values:** TEXT, NUMBER, DECIMAL, BOOLEAN, DATE, DATETIME, SELECT, MULTI_SELECT, USER_REF, ITEM_REF, VENDOR_REF, FILE, DIMENSION

**When to use regular column vs JSONB:**
- Regular column: always present, used in JOINs, part of constraints, affects system logic
- JSONB: optional, varies by client/project, display/info only, admin-defined at runtime

---

## SECTION 11 — AUDI EXCEL DATA ANALYSIS (KEY FINDINGS)

Seven Excel files analysed from Audi client:

**May_2026.xlsx — Production Report:** Current chassis status tracking. STATUS values: STRUCTURE, OUTER, PAINTED, TRIM, FVI, PDI, RFD, DISP, YARD. Body age calculated from induction date. Active chassis include ~16 buses at various stages.

**Stock_report__APR-26__30_04_26.xlsx — 14 sheets:**
- MASTER sheet: ~200+ part codes with costs → seeds `part_master`
- ORDER sheet: opening stock + monthly plan → seeds `rm_inventory`
- RECD sheet: historical GRN records → seeds `grn_log`
- PR sheet: BOM matrix per model → seeds `master_bom`
- FAPS sheet: safety system parts (Safex Fire, Swastik brands)
- Special Part List: which store each part goes to → seeds `grn_routing_rule`

**HD_MATERIAL_LIST_08.xlsx:** HD bus BOM by section → seeds `master_bom` for HD model variants

**Data__oct_25_FVI_and_Shower_Straight_Pass_2025.xlsx:** FVI/Shower QA tracking — 30-40% non-straight-pass rate. Shortage vs quality defect distinction → `qa_defect_log.defect_type` = QUALITY_DEFECT | PARTS_SHORTAGE | WORK_PENDING | SPECIFICATION_MISMATCH

**FAPS system confirmed:** FAPS is a mandatory fire safety fitment. Two brands: Safex Fire and Swastik. Mapped as CPQ feature flags `faps_safex` and `faps_swastik` in `dynamic_features`. Parts have item codes AE004233, AE004234, AE004232, AE004338, AE019634.

**ADVANCE sheet discovery:** VECV makes advance payments against specific PO line items. `customer_advance` table added to track VECV PO reference, FERT/HALB codes, taxable amounts, GST breakdown.

**Sales invoice sequence:** Starts at 1254 (continuing from PATEL/PVT sheets). `sales_invoice.invoice_seq` sequence starts at 1254.

**~40 FERT codes identified:** Legacy 20.50D through HD 6200, including Skyline, Starline, Pro Wider, Pro AMTS, Gen4, CNG variants. All seeded in `fert_master`.

**17 active vendors identified:** MIGMA PACKTORN (ABS panels), SPEED PLASTOMAC (PVC), VIMSAR (aluminium), TECH FORCE (outer panels), SAFEX FIRE (FAPS), JTAC AIR CON (AC units), etc.

---

## SECTION 12 — LEGACY ERP ANALYSIS (erp_audi-38.sql)

This is the **parts manufacturing factory** (separate from bus body plant) — a job shop making steel tube parts for VECV, Tata Motors, M&M, and the bus body plants (Unit 2, Unit 3).

**Key concepts we adopted from legacy:**
- `rm_purchase_order` naming (adopted)
- `rm_inventory` naming (adopted)
- `rm_inventory_log` naming (adopted, immutable)
- `rm_consumption_log` naming (adopted + enhanced with audit_status)
- `rm_order_receiving_log` naming (adopted)
- `part_master` naming (adopted)
- `production_logs` naming (adopted)
- `qa_logs` naming (adopted)
- `dispatch_notes` naming (adopted)
- `vendor_rm_link` naming (adopted)
- `section_type_master` naming (adopted)

**69 gaps identified across two analysis passes:**

Key gaps now addressed in schema v3.4:
- G-01: `item_master` missing → now `part_master` (CRITICAL, was completely absent)
- G-45: Shift management → `shift_master` table added (both databases)
- G-46: Mobile login for operators → `login_users.mobile` + `login_identifier` field
- G-47: Weight-based PO pricing → `rm_purchase_order_details.calculated_weight`, `price_per_kg`
- G-48: GST per PO line → `line_cgst`, `line_sgst`, `line_igst` with auto-trigger
- G-63: In-app notification inbox → `notifications` table
- G-64: Vendor mobile as primary contact → email made optional
- G-65: Vendor type → `vendor_master.vendor_type` (MANUFACTURER/DISTRIBUTOR/TRADER etc.)
- G-66: Vendor payment terms → `payment_terms_days`, bank fields on vendor_master

**Future Project C (Bhagirath Brothers Parts Factory):** Job-shop paradigm. Would need plugin modules: `parts_manufacturing` (operation routing, job dispatch, piece serialization), `cutting_plan_optimization` (1D nesting), `shortage_forecast` (multi-bucket day 0/3/6/month), `assembly_traceability`. NOT in current scope but planned for platform library.

---

## SECTION 13 — IMMUTABILITY RULES

These tables have `fn_block_immutable()` trigger — NO UPDATE or DELETE ever:

**shared.sql:** `audit_log`, `override_log`, `rm_inventory_log`, `rejection_lifecycle_log`, `vendor_portal_action_log`, `unit_movement_log`, `module_admin_action_log`

**audi.sql:** `dealer_portal_action_log`

**asesa.sql:** `chassis_part_link`, `torque_log`, `ecu_flash_log`, `eol_test_log`

**Special immutability:**
- `vin_master`: UPDATE blocked when `is_locked = TRUE` (after dispatch)
- `harness_check_log`: UPDATE blocked when `overall_result != 'PENDING'` (after submission)
- `rm_inventory_log`: Full immutability via trigger

---

## SECTION 14 — KEY STORED PROCEDURES & TRIGGERS

**`fn_compute_po_detail_amounts()`** (shared.sql)
- Fires on INSERT/UPDATE of `rm_purchase_order_details`
- Auto-calculates: `calculated_weight` = qty × weight_per_piece_kg (from part_master)
- Auto-calculates: `line_total_amount` = weight × price_per_kg OR qty × unit_price
- Auto-calculates: CGST/SGST/IGST split from `gst_rate_pct`

**`fn_backflush_on_qa_pass(chassis_id, station_id, qa_log_id, operator_id)`** (audi.sql)
- Atomic PostgreSQL transaction
- Reads `master_bom` for FERT + station, filters by CPQ config
- `SELECT FOR UPDATE ORDER BY part_number ASC` (prevents deadlocks)
- Deducts from `rm_inventory` (FLOOR location)
- Writes immutable `rm_inventory_log` entry per item
- On shortage: ROLLBACK + log 'ROLLED_BACK' to backflush_log
- Returns JSONB: {status: 'SUCCESS', lines: N}

**`fn_prevent_negative_stock()`** (shared.sql)
- Trigger on `rm_inventory` BEFORE UPDATE
- Raises EXCEPTION if `current_stock_pcs < 0`

**`fn_validate_custom_fields(entity_type, custom_fields_jsonb)`** (shared.sql)
- Returns JSONB array of validation errors
- Used by API layer before INSERT to validate custom field values

**`fn_prevent_locked_vin()`** (asesa.sql)
- Trigger on `vin_master` BEFORE UPDATE
- Raises EXCEPTION if `is_locked = TRUE`

---

## SECTION 15 — CRON JOBS (Celery Beat)

| Cron | Schedule | What it does |
|---|---|---|
| body_age_recalculation | Every 15 min (Audi) | UPDATE chassis_ledger.body_age_hours |
| shortage_scan | Every 30 min | Scan rm_inventory for items below reorder_level |
| three_way_match_runner | Every 60 min (Audi) | Auto-match RECEIVED invoices |
| qa_hold_escalation | Every 60 min | Alert when qa_status=HOLD for >2 hours |
| obd_reminder | Every 4 hours (Audi) | Alert when dongle_status=NOT_CHECKED after 4 hours |
| warranty_expiry | Daily 08:00 | Fire 60/30/7-day expiry alerts |
| pm_due_alerts | Daily 07:00 | Alert when machine next_pm_due within 7 days |
| production_capacity | Every 2 hours | Refresh producible bus count per FERT |

---

## SECTION 16 — OPEN ITEMS (NOT YET RESOLVED)

### Both Projects:
- [ ] Confirmed store names from each client (needed before Phase 0 seeding)
- [ ] Module Admin nominees per module from each client

### ASESA:
- [ ] Cloud provider final decision (AWS or Azure)
- [ ] Engraving machine serial protocol and baud rate
- [ ] Confirmed station names (client chooses — not restricted to STN-01 format)
- [ ] BOM data (vehicle_model, station_code, part_number, qty, is_hv, is_serialised)
- [ ] Torque Specification Register — due Week 8
- [ ] Dev parts checklist — due Week 7
- [ ] EOL test thresholds confirmed — due Week 12

### Audi:
- [ ] OBD dongle vendor/SDK — managed via configurable dongle_config
- [ ] Tally version (Prime or ERP 9) — needed before Phase 2f
- [ ] BOM master data export from Engineering — due Week 7
- [ ] Defect master catalogue — due before Phase 2b
- [ ] Offline tablet device spec — Android or iOS

---

## SECTION 17 — MoM 26 MAY 2026 REQUIREMENTS (ALL INCORPORATED)

From the client meeting minutes:
- Multiple POs (not single monthly) → operational change, no schema change needed
- Three-stage inventory (Reserved → WIP → Consumed) → `rm_inventory.wip_pcs` added
- PO format standardisation → PO PDF template must match client's existing format
- Order tracking in-transit → `po_tracking_log` table added
- Debit note creation → `debit_note` table added
- PO status after debit note → PENDING_REPLACEMENT, REPLACEMENT_PO_RAISED added to status CHECK
- Inventory-based capacity indicator → `fn_production_capacity()` function
- Supplier lead time management → `vendor_rm_link.lead_time_days`
- Consumable buffer stock → `station_floor_buffer_config` table
- Finance: E-Way Bill + Delivery Challan + Insurance → chassis_ledger fields added
- Tax Invoice at dispatch → `sales_invoice` table + dispatch_documents doc_type
- Warranty: 18 months from dispatch → `warranty_log.duration_months = 18` default
- Tally integration → XML export function + `tally_export_config` table

---

## SECTION 18 — WHAT HAS BEEN PRODUCED (FILE LIST)

All files available in chat as downloadable outputs:

| File | Description |
|---|---|
| `shared.sql` | Complete shared schema (1,770 lines, 80 tables) |
| `audi.sql` | Audi plugin tables (869 lines, 29 tables + backflush proc) |
| `asesa.sql` | ASESA plugin tables (691 lines, 25 tables, SERIAL PKs) |
| `MODE_B_ARCHITECTURE_FINAL_V3.md` | Full architecture document (3,485 lines) |
| `phase1_complete_guide.md` | Phase 1 dev guide, API endpoints, 7-week checklist |
| `legacy_erp_analysis.md` | First-pass analysis of erp_audi-38.sql |
| `legacy_erp_analysis_pass2.md` | Second-pass analysis (procurement, QA, roles, shifts) |
| `audi_excel_analysis_erp_migration.md` | Excel data analysis + migration plan |
| `phase0_runbook_data_migration.sql` | Phase 0 setup scripts + data import templates |
| `phase1_inventory_po_schema_v3.4.sql` | Phase 1 schema additions with JSONB framework |

---

## SECTION 19 — SCHEMA VERSION HISTORY

| Version | What changed |
|---|---|
| 3.0.0 | Initial schema — 11 shared modules, ASESA + Audi plugin tables |
| 3.1.0 | 5 new topics: rejection lot (DL-001), admin (DL-002), gate replace (DL-003), multi-store+MIR (DL-004), station management (DL-005) |
| 3.2.0 | Excel + MoM: item_master (critical miss), sales_invoice, customer_advance, post_dispatch_service, dealer portal, wip_qty, chassis document fields, qa_defect_type |
| 3.3.0 | Legacy ERP analysis: vendor_item_price, transport_master, driver_master, trip_sheet, production_scrap_log, shortage_forecast, drawing fields on part_master, sourcing_type on BOM |
| 3.4.0 | Phase 1 schema: JSONB custom fields framework, procurement_source_master, rm_vendor_mapping, rm_store_mapping, po_status_master, rm_consumption_log with audit, shift_master, in-app notifications, mobile login |
| **1.0.0** | **Three-file restructure: shared.sql + audi.sql + asesa.sql following legacy erp_audi-38.sql naming conventions** |

---

## SECTION 20 — THINGS CLAUDE MUST ALWAYS REMEMBER

1. **Always follow erp_audi-38.sql naming** — `rm_purchase_order` not `vendor_po`, `part_master` not `item_master`, `login_users` not `user_master`, `production_logs` not `production_log`

2. **Three SQL files always** — shared.sql + audi.sql OR shared.sql + asesa.sql. Never one monolithic file.

3. **ASESA plugin tables = SERIAL PKs** — not UUID. FK columns pointing to shared tables are UUID type.

4. **Chassis gate and material gate are COMPLETELY SEPARATE (Audi D-11)** — never use `gate_log` for chassis arrivals. `chassis_ledger` is the 34-acre yard table.

5. **Stock credited only after put_away_task confirmed** — not at QC approval. This is locked and non-negotiable.

6. **NCR created FROM rejection_log** — not from batch directly. One rejection_log per bulk rejection.

7. **`machine_master` not `tool_master`** — `tool_master` was removed. All equipment including ASESA torque guns are in `machine_master`.

8. **`fn_backflush_on_qa_pass` ORDER BY part_number ASC** — this prevents deadlocks. Never change this ordering.

9. **`rm_inventory_log` is IMMUTABLE** — trigger blocks UPDATE and DELETE. Use signed `change_quantity_pcs` (positive=in, negative=out) following legacy pattern.

10. **Vendor email is optional** — either `contact_email` OR `contact_mobile` required. Never make both required.

11. **Custom fields use JSONB** — never add client-specific columns directly to shared tables. Always use `custom_field_definition` + JSONB pattern.

12. **ASESA `vin_master.is_locked = TRUE` means permanently locked** — trigger prevents any UPDATE after dispatch. This is a legal requirement.

---

## SECTION 21 — QUICK REFERENCE: TABLE → SQL FILE

| Table | File | Note |
|---|---|---|
| login_users | shared.sql | All users |
| role_master | shared.sql | Roles |
| part_master | shared.sql | Items/RM catalogue |
| vendor_master | shared.sql | Suppliers |
| vendor_rm_link | shared.sql | Vendor-item price mapping |
| rm_store_mapping | shared.sql | Item-to-store mapping |
| store_master | shared.sql | Physical stores |
| procurement_source_master | shared.sql | BOP, In-house etc. |
| rm_purchase_order | shared.sql | Purchase orders |
| rm_purchase_order_details | shared.sql | PO line items |
| po_tracking_log | shared.sql | In-transit events |
| grn_log | shared.sql | GRN header |
| grn_batch | shared.sql | GRN batch per item |
| rm_order_receiving_log | shared.sql | PO→GRN link |
| rm_inventory | shared.sql | Stock balance |
| rm_inventory_log | shared.sql | Immutable ledger |
| put_away_task | shared.sql | Pre-stock credit task |
| rm_consumption_log | shared.sql | Consumption with audit |
| material_issue_request | shared.sql | MIR (both projects) |
| daily_shortage | shared.sql | Multi-bucket shortage |
| checklist_master | shared.sql | Checklist templates |
| qa_incoming_log | shared.sql | Incoming QC |
| rejection_log | shared.sql | Bulk rejection lot |
| ncr_log | shared.sql | NCR |
| debit_note | shared.sql | Debit notes |
| gate_log | shared.sql | New gate entries |
| gate_entry | shared.sql | FROZEN historical |
| dispatch_notes | shared.sql | Dispatch records |
| warranty_log | shared.sql | Warranty records |
| machine_master | shared.sql | Equipment/tools |
| maintenance_log | shared.sql | Maintenance records |
| shift_master | shared.sql | Day/Night/General shifts |
| station_master | shared.sql | Production stations |
| unit_movement_log | shared.sql | Immutable movement log |
| scrap_tracking | shared.sql | Scrap per job |
| module_admin_mapping | shared.sql | Module admin config |
| custom_field_definition | shared.sql | JSONB field definitions |
| notifications | shared.sql | In-app notification inbox |
| vendor_portal_log | shared.sql | Supplier portal sessions |
| asn_log | shared.sql | Advance ship notices |
| — | — | — |
| chassis_ledger | audi.sql | Bus chassis records |
| yard_location_log | audi.sql | 34-acre yard movement |
| order_details | audi.sql | Customer/dealer orders |
| fert_master | audi.sql | Bus model definitions |
| master_bom | audi.sql | Station-mapped BOM |
| production_logs | audi.sql | Station production log |
| qa_logs | audi.sql | Station QA records |
| qa_defect_log | audi.sql | Individual defects |
| defect_master | audi.sql | Defect catalogue |
| backflush_log | audi.sql | Backflush execution |
| rework_log | audi.sql | Rework records |
| vendor_invoice | audi.sql | Vendor invoices |
| three_way_match_log | audi.sql | 3-way match |
| sales_invoice | audi.sql | Tax invoices at dispatch |
| dealer_master | audi.sql | Dealers |
| customer_advance | audi.sql | VECV advance payments |
| dealer_portal_log | audi.sql | Dealer portal sessions |
| post_dispatch_service | audi.sql | FAPS/rework returns |
| dongle_config | audi.sql | OBD field mappings |
| dongle_check_log | audi.sql | OBD check results |
| station_floor_buffer_config | audi.sql | Auto-MIR thresholds |
| — | — | — |
| vin_master | asesa.sql | VIN records |
| build_order | asesa.sql | Production build orders |
| build_order_details | asesa.sql | BOM lines per order |
| bom_station_mapping | asesa.sql | Admin BOM config |
| stock_reservation | asesa.sql | Reserved stock |
| chassis_part_link | asesa.sql | Immutable fitment records |
| station_activity_log | asesa.sql | Station in/out |
| hv_cosign_log | asesa.sql | HV Supervisor co-signs |
| hv_cert_log | asesa.sql | HV certificates |
| harness_check_log | asesa.sql | PIN-to-PIN records |
| torque_log | asesa.sql | Immutable torque events |
| firmware_library | asesa.sql | ECU firmware versions |
| ecu_flash_log | asesa.sql | Immutable flash records |
| eol_session | asesa.sql | EOL test sessions |
| eol_test_log | asesa.sql | Immutable EOL results |
| rejection_bay_bin | asesa.sql | Physical rejection bins |

---

*End of Master Context Prompt — Astute Bridge ERP — June 2026*
*Paste this document at the start of any new chat to continue with full context.*
