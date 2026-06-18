-- ============================================================
-- ASTUTE BRIDGE ERP
-- FILE: shared.sql
-- PURPOSE: Run on BOTH databases before project-specific files
-- USAGE:
--   Audi:  psql audi_bus_erp  < shared.sql
--          psql audi_bus_erp  < audi.sql
--   ASESA: psql asesa_ev_erp  < shared.sql
--          psql asesa_ev_erp  < asesa.sql
-- VERSION: 2.0
-- NAMING: Follows erp_audi-38.sql naming conventions
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- SECTION 1 — SCHEMA VERSION
-- ============================================================

CREATE TABLE schema_migrations (
    version         VARCHAR(30) PRIMARY KEY,
    description     TEXT NOT NULL,
    applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 2 — ROLES & USERS
-- ============================================================

CREATE TABLE role_master (
    role_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code       VARCHAR(20)  UNIQUE NOT NULL,
    role_name       VARCHAR(60)  NOT NULL,
    description     TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE login_users (
    user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code   VARCHAR(30)  UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    mobile          VARCHAR(20)  UNIQUE,
    email           VARCHAR(255) UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role_id         VARCHAR(20)  NOT NULL REFERENCES role_master(role_code),
    -- permission flags (role-level overrides)
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_by      UUID         REFERENCES login_users(user_id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_login_contact
        CHECK (email IS NOT NULL OR mobile IS NOT NULL)
);
CREATE INDEX idx_login_users_role   ON login_users(role_id)   WHERE is_active = TRUE;
CREATE INDEX idx_login_users_mobile ON login_users(mobile)    WHERE mobile IS NOT NULL;
CREATE INDEX idx_login_users_email  ON login_users(email)     WHERE email IS NOT NULL;

-- Multi-role junction (used where a user needs more than one role)
CREATE TABLE user_role_mapping (
    mapping_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES login_users(user_id) ON DELETE CASCADE,
    role_id     VARCHAR(20) NOT NULL REFERENCES role_master(role_code),
    granted_by  UUID REFERENCES login_users(user_id),
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role_id)
);

-- Per-module CRUD permissions per role
CREATE TABLE user_role_access (
    access_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_name VARCHAR(50) NOT NULL,
    role_id     VARCHAR(20) NOT NULL REFERENCES role_master(role_code),
    can_view    BOOLEAN NOT NULL DEFAULT FALSE,
    can_create  BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit    BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete  BOOLEAN NOT NULL DEFAULT FALSE,
    can_approve BOOLEAN NOT NULL DEFAULT FALSE,
    can_export  BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (module_name, role_id)
);
CREATE INDEX idx_ura_role ON user_role_access(role_id);

-- ============================================================
-- SECTION 3 — AUDIT & IMMUTABILITY
-- ============================================================

CREATE OR REPLACE FUNCTION fn_block_immutable()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Record in % is immutable. Operation: %',
        TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE audit_log (
    log_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        REFERENCES login_users(user_id),
    role_code       VARCHAR(20),
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(50)  NOT NULL,
    entity_id       TEXT,
    old_value       JSONB,
    new_value       JSONB,
    ip_address      INET,
    remarks         TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user   ON audit_log(user_id);
CREATE INDEX idx_audit_log_at     ON audit_log USING BRIN(created_at);

CREATE TRIGGER trg_audit_log_immutable
    BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION fn_block_immutable();

CREATE TABLE override_log (
    override_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES login_users(user_id),
    role_code       VARCHAR(20) NOT NULL,
    override_type   VARCHAR(80) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       TEXT        NOT NULL,
    reason          TEXT        NOT NULL CHECK (LENGTH(reason) >= 10),
    outcome         VARCHAR(15) NOT NULL
        CHECK (outcome IN ('APPROVED','REJECTED','ESCALATED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_override_entity ON override_log(entity_type, entity_id);

CREATE TRIGGER trg_override_log_immutable
    BEFORE UPDATE OR DELETE ON override_log
    FOR EACH ROW EXECUTE FUNCTION fn_block_immutable();

-- ============================================================
-- SECTION 4 — NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    notification_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES login_users(user_id),
    title           VARCHAR(200) NOT NULL,
    message         TEXT        NOT NULL,
    category        VARCHAR(30) NOT NULL
        CHECK (category IN (
            'STOCK_ALERT','QA_HOLD','QA_FAIL','PO_APPROVAL',
            'GRN_RECEIVED','REJECTION_RAISED','DISPATCH_READY',
            'TASK_ASSIGNED','SYSTEM','GENERAL'
        )),
    entity_type     VARCHAR(50),
    entity_id       UUID,
    action_url      VARCHAR(500),
    is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_unread ON notifications(user_id)
    WHERE is_read = FALSE;

CREATE TABLE notification_queue (
    queue_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    notif_type      VARCHAR(10) NOT NULL
        CHECK (notif_type IN ('EMAIL','SMS','WHATSAPP','PUSH')),
    recipient       VARCHAR(255) NOT NULL,
    subject         VARCHAR(500),
    body_template   VARCHAR(100) NOT NULL,
    template_vars   JSONB        NOT NULL DEFAULT '{}',
    status          VARCHAR(10)  NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','SENT','FAILED','CANCELLED')),
    attempts        SMALLINT     NOT NULL DEFAULT 0,
    error_detail    TEXT,
    scheduled_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_queue_pending
    ON notification_queue(status, scheduled_at) WHERE status = 'PENDING';

-- ============================================================
-- SECTION 5 — CUSTOM FIELD FRAMEWORK
-- ============================================================

CREATE TABLE custom_field_definition (
    field_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     VARCHAR(50) NOT NULL,
    field_key       VARCHAR(50) NOT NULL,
    field_label     VARCHAR(100) NOT NULL,
    field_type      VARCHAR(20) NOT NULL
        CHECK (field_type IN (
            'TEXT','NUMBER','DECIMAL','BOOLEAN','DATE','DATETIME',
            'SELECT','MULTI_SELECT','USER_REF','ITEM_REF',
            'VENDOR_REF','FILE','DIMENSION'
        )),
    field_options   JSONB,
    is_required     BOOLEAN     NOT NULL DEFAULT FALSE,
    is_searchable   BOOLEAN     NOT NULL DEFAULT FALSE,
    is_visible_in_list BOOLEAN    NOT NULL DEFAULT FALSE,
    -- TRUE = show as column in list/table view; FALSE = detail form only
    display_order   SMALLINT    NOT NULL DEFAULT 0,
    applies_to_groups TEXT[],
    default_value   JSONB,
    validation_rules JSONB,
    project_scope   VARCHAR(20) NOT NULL DEFAULT 'ALL'
        CHECK (project_scope IN ('ALL','ASESA','AUDI','PROJECT_C')),
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_by      UUID        REFERENCES login_users(user_id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (entity_type, field_key)
);
CREATE INDEX idx_cfd_entity ON custom_field_definition(entity_type)
    WHERE is_active = TRUE;

-- entity_custom_field_values: relational store for custom field values.
-- Dual approach: each entity table keeps custom_fields JSONB (fast read/write)
-- AND this table provides cross-entity search + per-field querying without JSONB ops.
CREATE TABLE entity_custom_field_values (
    value_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id        UUID        NOT NULL
        REFERENCES custom_field_definition(field_id) ON DELETE CASCADE,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID        NOT NULL,
    field_value     TEXT,
    -- Stored as TEXT; cast to correct type on read using field_type
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (field_id, entity_id)
);
CREATE INDEX idx_ecfv_entity ON entity_custom_field_values(entity_type, entity_id);
CREATE INDEX idx_ecfv_field  ON entity_custom_field_values(field_id);

-- Validate custom_fields JSONB against definitions
CREATE OR REPLACE FUNCTION fn_validate_custom_fields(
    p_entity_type   VARCHAR,
    p_custom_fields JSONB
) RETURNS JSONB AS $$
DECLARE
    v_field  RECORD;
    v_errors JSONB := '[]'::JSONB;
    v_val    JSONB;
BEGIN
    FOR v_field IN
        SELECT field_key, field_label, field_type, is_required, validation_rules
        FROM custom_field_definition
        WHERE entity_type = p_entity_type AND is_active = TRUE
    LOOP
        v_val := p_custom_fields -> v_field.field_key;
        IF v_field.is_required AND (v_val IS NULL OR v_val = 'null'::JSONB) THEN
            v_errors := v_errors || jsonb_build_object(
                'field', v_field.field_key,
                'error', v_field.field_label || ' is required');
        END IF;
    END LOOP;
    RETURN v_errors;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SECTION 6 — VENDOR MASTER
-- ============================================================

CREATE TABLE vendor_master (
    vendor_id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code             VARCHAR(30) UNIQUE NOT NULL,
    vendor_name             VARCHAR(255) NOT NULL,
    contact_person          VARCHAR(255),
    contact_mobile          VARCHAR(20),
    contact_email           VARCHAR(255),
    address                 TEXT,
    city                    VARCHAR(100),
    state                   VARCHAR(50),
    gst_number              VARCHAR(20),
    vendor_type             VARCHAR(20) NOT NULL DEFAULT 'SUPPLIER'
        CHECK (vendor_type IN (
            'MANUFACTURER','DISTRIBUTOR','TRADER',
            'SUBCONTRACTOR','SERVICE','SUPPLIER'
        )),
    payment_terms           INTEGER     NOT NULL DEFAULT 30,
    payment_mode            VARCHAR(20) NOT NULL DEFAULT 'BANK_TRANSFER'
        CHECK (payment_mode IN ('BANK_TRANSFER','CHEQUE','CASH','ADVANCE_ONLY')),
    bank_account_number     VARCHAR(30),
    bank_ifsc               VARCHAR(15),
    bank_name               VARCHAR(100),
    approved_item_codes     TEXT[]      NOT NULL DEFAULT '{}',
    portal_enabled          BOOLEAN     NOT NULL DEFAULT FALSE,
    portal_username         VARCHAR(100) UNIQUE,
    is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
    custom_fields           JSONB       NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_vendor_contact
        CHECK (contact_email IS NOT NULL OR contact_mobile IS NOT NULL)
);
CREATE INDEX idx_vendor_master_code   ON vendor_master(vendor_code);
CREATE INDEX idx_vendor_master_active ON vendor_master(is_active)
    WHERE is_active = TRUE;
CREATE INDEX idx_vendor_master_cf     ON vendor_master USING GIN(custom_fields);

CREATE TABLE vendor_scorecard (
    scorecard_id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id               UUID    NOT NULL REFERENCES vendor_master(vendor_id),
    period_start            DATE    NOT NULL,
    period_end              DATE    NOT NULL,
    deliveries_total        INTEGER NOT NULL DEFAULT 0,
    deliveries_on_time      INTEGER NOT NULL DEFAULT 0,
    batches_total           INTEGER NOT NULL DEFAULT 0,
    batches_first_pass      INTEGER NOT NULL DEFAULT 0,
    rejection_count         INTEGER NOT NULL DEFAULT 0,
    ncr_count               INTEGER NOT NULL DEFAULT 0,
    avg_lead_time_days      NUMERIC(8,2),
    on_time_pct             NUMERIC(8,2) GENERATED ALWAYS AS (
        CASE WHEN deliveries_total > 0
             THEN ROUND((deliveries_on_time::NUMERIC / deliveries_total)*100,2)
             ELSE NULL END) STORED,
    first_pass_pct          NUMERIC(8,2) GENERATED ALWAYS AS (
        CASE WHEN batches_total > 0
             THEN ROUND((batches_first_pass::NUMERIC / batches_total)*100,2)
             ELSE NULL END) STORED,
    calculated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (vendor_id, period_start, period_end)
);

-- ============================================================
-- SECTION 7 — PROCUREMENT SOURCE & RM MASTER
-- ============================================================

CREATE TABLE procurement_source_master (
    source_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    source_code     VARCHAR(30) UNIQUE NOT NULL,
    source_name     VARCHAR(100) NOT NULL,
    description     TEXT,
    requires_po     BOOLEAN     NOT NULL DEFAULT TRUE,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE
);

INSERT INTO procurement_source_master (source_code, source_name, requires_po) VALUES
    ('BOP',         'Buy on PO',                TRUE),
    ('INHOUSE_BOP', 'In-house BOP',             FALSE),
    ('ON_PLANT',    'On Plant (Consignment)',    FALSE),
    ('SUBCONTRACT', 'Sub-contracted',           TRUE),
    ('FREE_ISSUE',  'Free Issue by Client',     FALSE),
    ('IMPORT',      'Import Purchase',          TRUE);

-- section_type_master: follows legacy pattern exactly
CREATE TABLE section_type_master (
    section_type_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    section_type    VARCHAR(50) UNIQUE NOT NULL,
    -- TUBE | PLATE | C_CHANNEL | L_ANGLE | ROUND_PIPE | FLAT_BAR | I_BEAM
    description     TEXT,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE
);

INSERT INTO section_type_master (section_type) VALUES
    ('TUBE'),('PLATE'),('C_CHANNEL'),('L_ANGLE'),
    ('ROUND_PIPE'),('FLAT_BAR'),('SQUARE_BAR'),('I_BEAM')
ON CONFLICT (section_type) DO NOTHING;

-- material_type_master: admin-configurable material classification lookup.
-- Allows Module Admin to add new material categories without schema changes.
CREATE TABLE material_type_master (
    type_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    type_code       VARCHAR(50) UNIQUE NOT NULL,
    type_name       VARCHAR(100) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO material_type_master (type_code, type_name, description) VALUES
    ('MS_TUBE',      'MS Tube / Pipe',           'Mild steel structural tubes and pipes'),
    ('MS_PLATE',     'MS Plate / Sheet',         'Mild steel flat plates and sheets'),
    ('ABS_PANEL',    'ABS Panel',                'ABS body panels'),
    ('GLASS',        'Glass / Glazing',          'Windshield and window glass panels'),
    ('PAINT_FINISH', 'Paint / Primer / Finish',  'Paints, primers, surface coatings'),
    ('FASTENER',     'Fastener / Hardware',      'Bolts, nuts, screws, rivets, clamps'),
    ('ELECTRICAL',   'Electrical Component',     'Wires, fuses, connectors, relays, switches'),
    ('UPHOLSTERY',   'Upholstery / Fabric',      'Seat covers, carpets, headliners, trim'),
    ('RUBBER_SEAL',  'Rubber / Sealant',         'Gaskets, weather strips, adhesives, grommets'),
    ('CONSUMABLE',   'Consumable',               'Welding wire/rods, thinner, sandpaper, etc.'),
    ('AC_PART',      'AC Component',             'Air conditioning parts and sub-assemblies'),
    ('SAFETY_SYS',   'Safety System',            'FAPS, fire suppression, VLTS components'),
    ('TOOL_FIXTURE', 'Tool / Fixture',           'Production tools, jigs, calibrated equipment'),
    ('OTHER',        'Other',                    'Uncategorised material types')
ON CONFLICT (type_code) DO NOTHING;

-- rm_master: mirrors legacy rm_master + raw_material_master in one table
CREATE TABLE rm_master (
    rm_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number         VARCHAR(100) UNIQUE NOT NULL,
    -- The system item code (e.g. IU563043, AE001962)
    part_name           VARCHAR(255) NOT NULL,
    part_no_client      VARCHAR(100),
    -- Client's own drawing/part reference
    part_type           VARCHAR(20) NOT NULL DEFAULT 'FINISHED_PART'
        CHECK (part_type IN (
            'FINISHED_PART',    -- assembled / bought-out part
            'RAW_MATERIAL',     -- steel tube, plate, paint, etc.
            'SEMI_FINISHED',    -- cut-to-length before further ops
            'CONSUMABLE',       -- welding rod, wire, thinner
            'TOOL',             -- tracked tool / fixture
            'AC_UNIT',          -- high-value AC equipment
            'ASSEMBLY'          -- parent assembly with BOM
        )),
    material_type_id    UUID        REFERENCES material_type_master(type_id),
    -- Optional finer classification (e.g. MS_TUBE, ABS_PANEL, ELECTRICAL)
    sourcing_type       VARCHAR(20) NOT NULL DEFAULT 'BOP'
        CHECK (sourcing_type IN (
            'INHOUSE','BOP','VENDOR_SUPPLIED','SUBCONTRACT','FREE_ISSUE'
        )),
    procurement_source_id UUID      REFERENCES procurement_source_master(source_id),
    description         TEXT,
    unit_of_measurement VARCHAR(20) NOT NULL DEFAULT 'NOS',
    -- NOS | KG | MTR | LTR | SET | PAIR
    standard_cost       NUMERIC(14,4),
    reorder_level       NUMERIC(14,3),
    weight_per_piece_kg NUMERIC(12,6),
    -- For weight-based procurement. Used in PO line weight calculation.
    minimum_stock       NUMERIC(14,3),
    lead_time_days      INTEGER,
    -- RM-specific fields (populated when part_type = 'RAW_MATERIAL' / 'SEMI_FINISHED')
    rm_section          VARCHAR(30),
    -- '20X40', '40X40', '12X25'
    rm_thickness        FLOAT,
    rm_section_type     VARCHAR(30) REFERENCES section_type_master(section_type),
    rm_grade            VARCHAR(10),
    -- GP | HR | CR | SS
    standard_length_mm  FLOAT,
    -- Standard mill / stock length (e.g. 6000mm)
    cut_length          FLOAT,
    -- Actual cut-to-length dimension (mm)
    design_length       FLOAT,
    -- Design drawing length (mm) — may differ from cut_length
    cal_weight          FLOAT,
    -- Calculated weight per piece (kg) from section dimensions
    hsn_code            VARCHAR(20),
    gst_rate_pct        NUMERIC(6,2) DEFAULT 18.00,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    custom_fields       JSONB       NOT NULL DEFAULT '{}',
    created_by          UUID        REFERENCES login_users(user_id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rm_master_type    ON rm_master(part_type)    WHERE is_active = TRUE;
CREATE INDEX idx_rm_master_section ON rm_master(rm_section)
    WHERE rm_section IS NOT NULL;
CREATE INDEX idx_rm_master_no      ON rm_master(part_no_client)
    WHERE part_no_client IS NOT NULL;
CREATE INDEX idx_rm_master_cf      ON rm_master USING GIN(custom_fields);

-- rm_vendor_mapping: follows legacy naming exactly
CREATE TABLE rm_vendor_mapping (
    mapping_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number     VARCHAR(100) NOT NULL REFERENCES rm_master(part_number),
    vendor_id       UUID        NOT NULL REFERENCES vendor_master(vendor_id),
    unit_price      NUMERIC(14,4),
    price_basis     VARCHAR(15) NOT NULL DEFAULT 'PER_UNIT'
        CHECK (price_basis IN ('PER_UNIT','PER_KG','PER_MTR','PER_SET')),
    moq             INTEGER,
    lead_time_days  INTEGER,
    is_preferred    BOOLEAN     NOT NULL DEFAULT FALSE,
    last_price_date DATE,
    description     TEXT,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (part_number, vendor_id)
);
CREATE INDEX idx_rm_vendor_mapping_part   ON rm_vendor_mapping(part_number) WHERE is_active = TRUE;
CREATE INDEX idx_rm_vendor_mapping_vendor ON rm_vendor_mapping(vendor_id)   WHERE is_active = TRUE;
CREATE UNIQUE INDEX idx_rm_vendor_mapping_preferred
    ON rm_vendor_mapping(part_number) WHERE is_preferred = TRUE AND is_active = TRUE;

-- bom_components: follows legacy naming
CREATE TABLE bom_components (
    bom_id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    assembly_part_number VARCHAR(100) NOT NULL
        REFERENCES rm_master(part_number),
    child_part_number   VARCHAR(100) NOT NULL
        REFERENCES rm_master(part_number),
    quantity            NUMERIC(14,3) NOT NULL DEFAULT 1,
    sourcing_type       VARCHAR(20) NOT NULL DEFAULT 'INHOUSE'
        CHECK (sourcing_type IN ('INHOUSE','VENDOR_SUPPLIED','SUBCONTRACT')),
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    UNIQUE (assembly_part_number, child_part_number)
);

-- ============================================================
-- SECTION 8 — STORE MASTER
-- ============================================================

CREATE TABLE store_master (
    store_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    store_code      VARCHAR(50) UNIQUE NOT NULL,
    store_name      VARCHAR(200) NOT NULL,
    store_type      VARCHAR(25) NOT NULL
        CHECK (store_type IN (
            'MAIN_STORE','FLOOR_INVENTORY','REJECTION_STORE',
            'SCRAP_STORE','QUARANTINE','HV_CONTROLLED','TOOL_STORE','FG_STORE'
        )),
    store_location  VARCHAR(200),
    manager_id      UUID        REFERENCES login_users(user_id),
    allows_direct_issue BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- rm_store_mapping: follows legacy rm_vendor_mapping naming pattern
CREATE TABLE rm_store_mapping (
    mapping_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number         VARCHAR(100) NOT NULL REFERENCES rm_master(part_number),
    store_id            UUID        NOT NULL REFERENCES store_master(store_id),
    is_primary_store    BOOLEAN     NOT NULL DEFAULT TRUE,
    bin_hint            VARCHAR(50),
    min_qty             NUMERIC(14,3),
    max_qty             NUMERIC(14,3),
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    UNIQUE (part_number, store_id)
);
CREATE INDEX idx_rm_store_mapping_part  ON rm_store_mapping(part_number) WHERE is_active = TRUE;
CREATE INDEX idx_rm_store_mapping_store ON rm_store_mapping(store_id)    WHERE is_active = TRUE;

-- grn_routing_rule: determines which store a received item goes to
CREATE TABLE grn_routing_rule (
    rule_id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    priority            SMALLINT    NOT NULL,
    rule_type           VARCHAR(25) NOT NULL
        CHECK (rule_type IN (
            'PART_OVERRIDE','PART_TYPE','SECTION_TYPE','RM_GRADE','DEFAULT'
        )),
    match_value         VARCHAR(100),
    destination_store_id UUID       NOT NULL REFERENCES store_master(store_id),
    bin_hint            VARCHAR(100),
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_by          UUID        REFERENCES login_users(user_id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_grn_routing_rule ON grn_routing_rule(priority, rule_type, match_value) WHERE is_active = TRUE;

-- ============================================================
-- SECTION 9 — SHIFT MASTER
-- ============================================================

CREATE TABLE shift_master (
    shift_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_code  VARCHAR(20) UNIQUE NOT NULL,
    shift_name  VARCHAR(50) NOT NULL,
    start_time  TIME        NOT NULL,
    end_time    TIME        NOT NULL,
    is_overnight BOOLEAN    NOT NULL DEFAULT FALSE,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE
);

INSERT INTO shift_master (shift_code, shift_name, start_time, end_time, is_overnight)
VALUES
    ('DAY',     'Day Shift',     '08:00', '20:00', FALSE),
    ('NIGHT',   'Night Shift',   '20:00', '08:00', TRUE),
    ('GENERAL', 'General Shift', '09:00', '18:00', FALSE)
ON CONFLICT (shift_code) DO NOTHING;

-- ============================================================
-- SECTION 10 — STATION MASTER
-- ============================================================

CREATE TABLE operation_master (
    operation_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_name  VARCHAR(100) UNIQUE NOT NULL,
    operation_type  VARCHAR(20) NOT NULL
        CHECK (operation_type IN (
            'CUTTING','BENDING','ROLLING','WELDING','DRILLING',
            'TRIMMING','ASSEMBLY','PAINTING','TESTING',
            'FLASHING','EOL','INSPECTION','DISPATCH','BUFFER'
        )),
    description     TEXT,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE TABLE station_master (
    station_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    station_code        VARCHAR(50) UNIQUE NOT NULL,
    station_name        VARCHAR(255) NOT NULL,
    station_description TEXT,
    operation_id        UUID        REFERENCES operation_master(operation_id),
    machine_type        VARCHAR(20)
        CHECK (machine_type IN ('MANUAL','CNC','SEMI_AUTO','AUTOMATIC',NULL)),
    machine_cut_thk     FLOAT,
    operation_capacity  FLOAT,
    operation_capacity_unit VARCHAR(20),
    max_weight_capacity FLOAT,
    sequence_no         INTEGER,
    requires_qa         BOOLEAN     NOT NULL DEFAULT TRUE,
    is_rework_station   BOOLEAN     NOT NULL DEFAULT FALSE,
    is_external_station BOOLEAN     NOT NULL DEFAULT FALSE,
    is_conditional      BOOLEAN     NOT NULL DEFAULT FALSE,
    condition_key       VARCHAR(50),
    hv_station_flag     BOOLEAN     NOT NULL DEFAULT FALSE,
    backflush_enabled   BOOLEAN     NOT NULL DEFAULT FALSE,
    standard_cycle_time_min INTEGER,
    primary_operator_id UUID        REFERENCES login_users(user_id),
    station_model       VARCHAR(20) NOT NULL DEFAULT 'MULTI_OPERATOR'
        CHECK (station_model IN ('MULTI_OPERATOR','SINGLE_OPERATOR','AUTONOMOUS')),
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    custom_fields       JSONB       NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_station_master_seq ON station_master(sequence_no) WHERE is_active = TRUE;

-- station_operator_mapping: follows legacy supervisor_station_maping pattern
CREATE TABLE station_operator_mapping (
    mapping_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id      UUID        NOT NULL REFERENCES station_master(station_id),
    user_id         UUID        NOT NULL REFERENCES login_users(user_id),
    role_at_station VARCHAR(20) NOT NULL
        CHECK (role_at_station IN ('OPERATOR','QA_INSPECTOR','SUPERVISOR')),
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    assigned_by     UUID        NOT NULL REFERENCES login_users(user_id),
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_station_operator_mapping ON station_operator_mapping(station_id, user_id, role_at_station) WHERE is_active = TRUE;

-- machine_master: follows legacy naming (asset_master → machine_master)
CREATE TABLE machine_master (
    machine_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_code        VARCHAR(60) UNIQUE NOT NULL,
    machine_name        VARCHAR(200) NOT NULL,
    machine_type        VARCHAR(20) NOT NULL DEFAULT 'MACHINE'
        CHECK (machine_type IN ('MACHINE','TOOL','VEHICLE','FIXTURE')),
    station_id          UUID        REFERENCES station_master(station_id),
    manufacturer        VARCHAR(150),
    model_number        VARCHAR(100),
    serial_number       VARCHAR(100),
    purchase_date       DATE,
    purchase_cost       NUMERIC(14,2),
    warranty_expiry     DATE,
    maintenance_freq_days SMALLINT  NOT NULL DEFAULT 30,
    last_pm_date        DATE,
    next_pm_due_date    DATE GENERATED ALWAYS AS
        (last_pm_date + maintenance_freq_days) STORED,
    is_critical         BOOLEAN     NOT NULL DEFAULT FALSE,
    calibration_due_date DATE,
    calibration_cert_ref VARCHAR(100),
    calibration_cert_path TEXT,
    recall_flag         BOOLEAN     NOT NULL DEFAULT FALSE,
    recall_registered_at TIMESTAMPTZ,
    communication_protocol VARCHAR(10)
        CHECK (communication_protocol IN ('USB','BLUETOOTH','ETHERNET',NULL)),
    tool_vendor         VARCHAR(20)
        CHECK (tool_vendor IN ('ATLAS_COPCO','DESOUTTER','INGERSOLL_RAND','STANLEY',NULL)),
    status              VARCHAR(15) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','EXPIRED','RECALLED','DECOMMISSIONED')),
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_machine_master_status ON machine_master(status)   WHERE is_active = TRUE;
CREATE INDEX idx_machine_master_cal    ON machine_master(calibration_due_date)
    WHERE calibration_due_date IS NOT NULL AND is_active = TRUE;

CREATE TABLE station_machine_mapping (
    mapping_id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id          UUID    NOT NULL REFERENCES station_master(station_id),
    machine_id          UUID    NOT NULL REFERENCES machine_master(machine_id),
    is_required         BOOLEAN NOT NULL DEFAULT FALSE,
    is_primary_station  BOOLEAN NOT NULL DEFAULT TRUE,
    linked_by           UUID    REFERENCES login_users(user_id),
    linked_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (station_id, machine_id)
);

CREATE TABLE maintenance_log (
    log_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id      UUID        NOT NULL REFERENCES machine_master(machine_id),
    maintenance_type VARCHAR(15) NOT NULL
        CHECK (maintenance_type IN
            ('PREVENTIVE','CORRECTIVE','BREAKDOWN','CALIBRATION')),
    status          VARCHAR(15) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN','IN_PROGRESS','PENDING_PARTS','CLOSED')),
    reported_by     UUID        NOT NULL REFERENCES login_users(user_id),
    symptom_description TEXT,
    work_done       TEXT,
    start_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time        TIMESTAMPTZ,
    downtime_minutes INTEGER GENERATED ALWAYS AS (
        CASE WHEN end_time IS NOT NULL
             THEN EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER / 60
             ELSE NULL END) STORED,
    production_impact INTEGER NOT NULL DEFAULT 0,
    total_spare_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    closed_by       UUID        REFERENCES login_users(user_id),
    closed_at       TIMESTAMPTZ,
    calibration_new_expiry DATE,
    calibration_cert_uploaded BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_maintenance_log_machine ON maintenance_log(machine_id);
CREATE INDEX idx_maintenance_log_open    ON maintenance_log(status)
    WHERE status != 'CLOSED';

CREATE TABLE maintenance_spares_log (
    log_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_id  UUID        NOT NULL REFERENCES maintenance_log(log_id),
    part_number     VARCHAR(100),
    qty_used        NUMERIC(10,3) NOT NULL,
    unit_cost       NUMERIC(14,4),
    total_cost      NUMERIC(12,2) GENERATED ALWAYS AS (qty_used * unit_cost) STORED,
    issued_by       UUID        REFERENCES login_users(user_id),
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE machine_recall_log (
    recall_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id      UUID        NOT NULL REFERENCES machine_master(machine_id),
    recall_reference VARCHAR(100) NOT NULL,
    recall_reason   TEXT        NOT NULL,
    registered_by   UUID        NOT NULL REFERENCES login_users(user_id),
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ,
    resolution_note TEXT,
    affected_unit_count INTEGER,
    query_run_at    TIMESTAMPTZ
);

-- ============================================================
-- SECTION 11 — TRANSPORT MASTER
-- ============================================================

CREATE TABLE driver_master (
    driver_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_name     VARCHAR(150) NOT NULL,
    driver_mobile   VARCHAR(20),
    licence_number  VARCHAR(30),
    licence_expiry  DATE,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE truck_master (
    truck_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    truck_number    VARCHAR(30) UNIQUE NOT NULL,
    vehicle_type    VARCHAR(20) NOT NULL DEFAULT 'TRUCK'
        CHECK (vehicle_type IN ('TRUCK','TEMPO','PICKUP','CONTAINER')),
    owner_name      VARCHAR(150),
    transporter_name VARCHAR(200),
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 12 — GATE ENTRY
-- ============================================================

CREATE TABLE gate_transaction_type_master (
    type_code       VARCHAR(80)  PRIMARY KEY,
    type_name       VARCHAR(200) NOT NULL,
    direction       VARCHAR(5)   NOT NULL CHECK (direction IN ('IN','OUT')),
    requires_reference BOOLEAN   NOT NULL DEFAULT FALSE,
    reference_type  VARCHAR(30),
    form_type       VARCHAR(40)  NOT NULL,
    requires_supervisor BOOLEAN  NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE
);

INSERT INTO gate_transaction_type_master
    (type_code, type_name, direction, requires_reference, reference_type, form_type)
VALUES
    ('INWARD_RM',       'Raw Material Inward',          'IN',  TRUE,  'PO',      'GRN_PO_FORM'),
    ('INWARD_FINISHED', 'Finished Goods Inward',        'IN',  FALSE, NULL,      'SIMPLE_LOG'),
    ('VEHICLE_DISPATCH','Vehicle / Goods Dispatch',     'OUT', TRUE,  'DISPATCH','DISPATCH_FORM'),
    ('VEHICLE_OUT_WORK','Vehicle Out for External Work','OUT', FALSE, NULL,      'CUSTOM_CHECKLIST'),
    ('VEHICLE_RETURN',  'Vehicle Return from Work',     'IN',  FALSE, NULL,      'CUSTOM_CHECKLIST'),
    ('VENDOR_COLLECT',  'Vendor Collecting Rejection',  'OUT', TRUE,  'RLN',     'CUSTOM_CHECKLIST'),
    ('SCRAP_OUT',       'Scrap Dispatch',               'OUT', FALSE, NULL,      'SIMPLE_LOG'),
    ('VISITOR_IN',      'Visitor Entry',                'IN',  FALSE, NULL,      'SIMPLE_LOG'),
    ('VISITOR_OUT',     'Visitor Exit',                 'OUT', FALSE, NULL,      'SIMPLE_LOG')
ON CONFLICT (type_code) DO NOTHING;

CREATE TABLE gate_profile (
    profile_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_code    VARCHAR(60) UNIQUE NOT NULL,
    profile_name    VARCHAR(200) NOT NULL,
    gate_location   VARCHAR(150),
    escalation_contact UUID     REFERENCES login_users(user_id),
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gate_profile_type_mapping (
    mapping_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID        NOT NULL REFERENCES gate_profile(profile_id),
    type_code       VARCHAR(80) NOT NULL
        REFERENCES gate_transaction_type_master(type_code),
    display_order   SMALLINT,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    UNIQUE (profile_id, type_code)
);

-- gate_entry: frozen legacy table (historical rows only after cutover)
CREATE TABLE gate_entry (
    gate_entry_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_entry_no   VARCHAR(50) UNIQUE NOT NULL,
    gate_pass_no    VARCHAR(50) UNIQUE,
    po_id           UUID,
    vendor_id       UUID        REFERENCES vendor_master(vendor_id),
    vehicle_number  VARCHAR(50),
    driver_name     VARCHAR(255),
    entry_type      VARCHAR(20)
        CHECK (entry_type IN ('PLANNED','UNPLANNED','PARTIAL','EXCESS')),
    status          VARCHAR(15) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    gate_operator_id UUID       REFERENCES login_users(user_id),
    supervisor_id   UUID        REFERENCES login_users(user_id),
    supervisor_note TEXT,
    arrived_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE gate_entry IS
    'LEGACY: historical records only. New gate events use gate_log table.';

-- gate_log: new replacement for gate_entry
CREATE TABLE gate_log (
    gate_log_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_log_no     VARCHAR(50) UNIQUE NOT NULL,
    profile_id      UUID        NOT NULL REFERENCES gate_profile(profile_id),
    type_code       VARCHAR(80) NOT NULL
        REFERENCES gate_transaction_type_master(type_code),
    direction       VARCHAR(5)  NOT NULL CHECK (direction IN ('IN','OUT')),
    status          VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS'
        CHECK (status IN (
            'IN_PROGRESS','FLAGGED','SUPERVISOR_REVIEW',
            'COMPLETED','REJECTED','CANCELLED'
        )),
    operator_id     UUID        NOT NULL REFERENCES login_users(user_id),
    supervisor_id   UUID        REFERENCES login_users(user_id),
    supervisor_decision VARCHAR(10)
        CHECK (supervisor_decision IN ('APPROVED','REJECTED',NULL)),
    supervisor_note TEXT,
    detail_data     JSONB       NOT NULL DEFAULT '{}',
    checklist_response_id UUID,
    flag_reason     TEXT,
    flagged_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_gate_log_status ON gate_log(status)
    WHERE status IN ('IN_PROGRESS','FLAGGED','SUPERVISOR_REVIEW');
CREATE INDEX idx_gate_log_detail ON gate_log USING GIN(detail_data);

-- ============================================================
-- SECTION 13 — PURCHASE ORDER
-- ============================================================

CREATE TABLE po_status_master (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    status_code     VARCHAR(35) UNIQUE NOT NULL,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    display_colour  VARCHAR(10),
    sort_order      SMALLINT    NOT NULL DEFAULT 0
);

INSERT INTO po_status_master (status_code, name, display_colour, sort_order)
VALUES
    ('DRAFT',               'Draft',                '#94a3b8', 1),
    ('PENDING_APPROVAL',    'Pending Approval',     '#f59e0b', 2),
    ('APPROVED',            'Approved',             '#3b82f6', 3),
    ('PARTIAL',             'Partially Received',   '#8b5cf6', 4),
    ('COMPLETED',           'Completed',            '#22c55e', 5),
    ('CANCELLED',           'Cancelled',            '#ef4444', 6),
    ('BLOCKED_VARIANCE',    'Blocked — Variance',   '#ef4444', 7),
    ('VENDOR_ACCEPTED',     'Vendor Accepted',      '#10b981', 8),
    ('VENDOR_DECLINED',     'Vendor Declined',      '#ef4444', 9),
    ('PENDING_REPLACEMENT', 'Pending Replacement',  '#f59e0b', 10)
ON CONFLICT (status_code) DO NOTHING;

CREATE TABLE rm_purchase_order (
    po_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number       VARCHAR(50) UNIQUE NOT NULL,
    vendor_id       UUID        NOT NULL REFERENCES vendor_master(vendor_id),
    order_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
    expected_date   DATE,
    status          VARCHAR(35) NOT NULL DEFAULT 'DRAFT'
        REFERENCES po_status_master(status_code),
    po_type         VARCHAR(20) NOT NULL DEFAULT 'STANDARD'
        CHECK (po_type IN ('STANDARD','BLANKET','EMERGENCY','REPLACEMENT','IMPORT')),
    created_by      UUID        NOT NULL REFERENCES login_users(user_id),
    approved_by     UUID        REFERENCES login_users(user_id),
    approved_at     TIMESTAMPTZ,
    total_weight_kg NUMERIC(14,3),
    total_amount    NUMERIC(14,2),
    total_with_tax  NUMERIC(14,2),
    freight_amount  NUMERIC(12,2),
    payment_terms_days INTEGER,
    cancelled_by    UUID        REFERENCES login_users(user_id),
    cancel_reason   TEXT,
    remarks         TEXT,
    custom_fields   JSONB       NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rm_po_vendor ON rm_purchase_order(vendor_id);
CREATE INDEX idx_rm_po_status ON rm_purchase_order(status)
    WHERE status NOT IN ('COMPLETED','CANCELLED');

CREATE TABLE rm_purchase_order_details (
    po_detail_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id           UUID        NOT NULL
        REFERENCES rm_purchase_order(po_id) ON DELETE CASCADE,
    part_number     VARCHAR(100) NOT NULL REFERENCES rm_master(part_number),
    ordered_quantity NUMERIC(14,3) NOT NULL CHECK (ordered_quantity > 0),
    received_quantity NUMERIC(14,3) NOT NULL DEFAULT 0
        CHECK (received_quantity >= 0),
    unit_price      NUMERIC(14,4),
    price_per_kg    NUMERIC(14,4),
    price_basis     VARCHAR(15) NOT NULL DEFAULT 'PER_UNIT'
        CHECK (price_basis IN ('PER_UNIT','PER_KG','PER_MTR','PER_SET')),
    calculated_weight NUMERIC(14,3),
    line_total_amount NUMERIC(14,2),
    hsn_code        VARCHAR(20),
    gst_rate_pct    NUMERIC(6,2) DEFAULT 18.00,
    line_cgst       NUMERIC(12,2),
    line_sgst       NUMERIC(12,2),
    line_igst       NUMERIC(12,2) DEFAULT 0,
    line_total_with_tax NUMERIC(14,2),
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','PARTIAL','COMPLETED','CANCELLED')),
    custom_fields   JSONB       NOT NULL DEFAULT '{}',
    CONSTRAINT chk_received_lte_ordered
        CHECK (received_quantity <= ordered_quantity)
);
CREATE INDEX idx_rm_pod_po ON rm_purchase_order_details(po_id);

-- Auto-compute weight and GST on PO detail line
CREATE OR REPLACE FUNCTION fn_compute_po_detail_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Weight-based amount
    IF NEW.price_basis = 'PER_KG' AND NEW.ordered_quantity IS NOT NULL THEN
        SELECT NEW.ordered_quantity * COALESCE(pm.weight_per_piece_kg, pm.cal_weight, 0)
        INTO NEW.calculated_weight
        FROM rm_master pm WHERE pm.part_number = NEW.part_number;
        NEW.line_total_amount := ROUND(
            COALESCE(NEW.calculated_weight, 0) * COALESCE(NEW.price_per_kg, 0), 2);
    ELSE
        NEW.line_total_amount := ROUND(
            NEW.ordered_quantity * COALESCE(NEW.unit_price, 0), 2);
    END IF;
    -- GST split
    IF NEW.line_total_amount IS NOT NULL AND NEW.gst_rate_pct IS NOT NULL THEN
        IF COALESCE(NEW.line_igst, 0) > 0 THEN
            NEW.line_igst  := ROUND(NEW.line_total_amount * NEW.gst_rate_pct / 100, 2);
            NEW.line_cgst  := 0;
            NEW.line_sgst  := 0;
        ELSE
            NEW.line_cgst  := ROUND(NEW.line_total_amount * NEW.gst_rate_pct / 200, 2);
            NEW.line_sgst  := ROUND(NEW.line_total_amount * NEW.gst_rate_pct / 200, 2);
            NEW.line_igst  := 0;
        END IF;
        NEW.line_total_with_tax :=
            NEW.line_total_amount +
            COALESCE(NEW.line_cgst, 0) +
            COALESCE(NEW.line_sgst, 0) +
            COALESCE(NEW.line_igst, 0);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_po_detail_amounts
    BEFORE INSERT OR UPDATE ON rm_purchase_order_details
    FOR EACH ROW EXECUTE FUNCTION fn_compute_po_detail_amounts();

CREATE TABLE po_tracking_log (
    log_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id           UUID        NOT NULL REFERENCES rm_purchase_order(po_id),
    event_type      VARCHAR(30) NOT NULL
        CHECK (event_type IN (
            'PO_SENT','VENDOR_ACKNOWLEDGED','VENDOR_DISPATCHED',
            'IN_TRANSIT','GATE_ARRIVED','PARTIAL_RECEIVED','COMPLETED'
        )),
    event_notes     TEXT,
    tracking_ref    VARCHAR(100),
    recorded_by     UUID        REFERENCES login_users(user_id),
    event_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_po_tracking_log ON po_tracking_log(po_id);

-- ============================================================
-- SECTION 14 — GRN & RECEIVING
-- ============================================================

CREATE TABLE rm_receiving_log (
    grn_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_number      VARCHAR(50) UNIQUE NOT NULL,
    gate_entry_id   UUID        REFERENCES gate_entry(gate_entry_id),
    gate_log_id     UUID        REFERENCES gate_log(gate_log_id),
    po_id           UUID        NOT NULL REFERENCES rm_purchase_order(po_id),
    vendor_id       UUID        NOT NULL REFERENCES vendor_master(vendor_id),
    received_by     UUID        NOT NULL REFERENCES login_users(user_id),
    received_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
    -- Physical receipt date (may differ from created_at for backdated/weekend entries)
    vehicle_number  VARCHAR(20),
    -- Delivery vehicle; pre-populated from gate_log when gate_log_id is linked
    grn_status      VARCHAR(20) NOT NULL DEFAULT 'PENDING_QC'
        CHECK (grn_status IN ('PENDING_QC','PARTIALLY_INSPECTED','COMPLETED')),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_grn_gate_ref CHECK (
        (gate_entry_id IS NOT NULL AND gate_log_id IS NULL) OR
        (gate_entry_id IS NULL AND gate_log_id IS NOT NULL)
    )
);
CREATE INDEX idx_rm_receiving_log_po     ON rm_receiving_log(po_id);
CREATE INDEX idx_rm_receiving_log_vendor ON rm_receiving_log(vendor_id);

CREATE TABLE grn_detail (
    batch_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id          UUID        NOT NULL REFERENCES rm_receiving_log(grn_id),
    po_detail_id    UUID        REFERENCES rm_purchase_order_details(po_detail_id),
    batch_code      VARCHAR(100) UNIQUE NOT NULL,
    part_number     VARCHAR(100) NOT NULL REFERENCES rm_master(part_number),
    qty_received    NUMERIC(14,3) NOT NULL CHECK (qty_received > 0),
    qty_accepted    NUMERIC(14,3) NOT NULL DEFAULT 0,
    qty_rejected    NUMERIC(14,3) NOT NULL DEFAULT 0,
    rejection_reason TEXT,
    weight_received_kg NUMERIC(14,3),
    uom             VARCHAR(20) NOT NULL DEFAULT 'NOS',
    batch_status    VARCHAR(20) NOT NULL DEFAULT 'PENDING_QC'
        CHECK (batch_status IN (
            'PENDING_QC','QC_APPROVED','QC_HOLD','REJECTED',
            'QUARANTINE','RECALLED','VENDOR_RETURN','SCRAPPED'
        )),
    destination_store_id UUID   REFERENCES store_master(store_id),
    assigned_operator_id UUID   REFERENCES login_users(user_id),
    bin_location    VARCHAR(50),
    location_type   VARCHAR(20) NOT NULL DEFAULT 'MAIN'
        CHECK (location_type IN ('MAIN','FLOOR','QC_HOLD','REJECTION','SCRAP')),
    fifo_rank       INTEGER,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    custom_fields   JSONB       NOT NULL DEFAULT '{}',
    CONSTRAINT chk_batch_qty
        CHECK (qty_accepted + qty_rejected <= qty_received)
);
CREATE INDEX idx_grn_detail_grn    ON grn_detail(grn_id);
CREATE INDEX idx_grn_detail_part   ON grn_detail(part_number);
CREATE INDEX idx_grn_detail_status ON grn_detail(batch_status);

-- rm_order_receiving_log: follows legacy naming exactly
CREATE TABLE rm_order_receiving_log (
    log_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id          UUID        NOT NULL REFERENCES rm_receiving_log(grn_id),
    po_id           UUID        NOT NULL REFERENCES rm_purchase_order(po_id),
    po_detail_id    UUID        REFERENCES rm_purchase_order_details(po_detail_id),
    batch_id        UUID        NOT NULL REFERENCES grn_detail(batch_id),
    part_number     VARCHAR(100) NOT NULL,
    received_qty    NUMERIC(14,3) NOT NULL,
    received_weight_kg NUMERIC(14,3),
    challan_number  VARCHAR(100),
    invoice_number  VARCHAR(100),
    vehicle_number  VARCHAR(30),
    received_by     UUID        NOT NULL REFERENCES login_users(user_id),
    remarks         TEXT,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rm_recv_log_grn ON rm_order_receiving_log(grn_id);
CREATE INDEX idx_rm_recv_log_po  ON rm_order_receiving_log(po_id);

-- ============================================================
-- SECTION 15 — INVENTORY
-- ============================================================

CREATE TABLE rm_inventory (
    inventory_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number     VARCHAR(100) NOT NULL REFERENCES rm_master(part_number),
    store_id        UUID        NOT NULL REFERENCES store_master(store_id),
    location_type   VARCHAR(20) NOT NULL DEFAULT 'MAIN'
        CHECK (location_type IN ('MAIN','FLOOR','QC_HOLD','REJECTION','SCRAP')),
    bin_location    VARCHAR(50),
    batch_id        UUID        REFERENCES grn_detail(batch_id),
    current_stock_pcs NUMERIC(14,3) NOT NULL DEFAULT 0
        CHECK (current_stock_pcs >= 0),
    reserved_pcs    NUMERIC(14,3) NOT NULL DEFAULT 0
        CHECK (reserved_pcs >= 0),
    wip_pcs         NUMERIC(14,3) NOT NULL DEFAULT 0
        CHECK (wip_pcs >= 0),
    pending_putaway_pcs NUMERIC(14,3) NOT NULL DEFAULT 0
        CHECK (pending_putaway_pcs >= 0),
    in_transit_qty  NUMERIC(14,3) NOT NULL DEFAULT 0
        CHECK (in_transit_qty >= 0),
    -- Stock ordered & dispatched by vendor but not yet received at gate
    last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (part_number, store_id, location_type, bin_location, batch_id)
);
CREATE INDEX idx_rm_inventory_part  ON rm_inventory(part_number);
CREATE INDEX idx_rm_inventory_store ON rm_inventory(store_id, location_type);

CREATE OR REPLACE FUNCTION fn_prevent_negative_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_stock_pcs < 0 THEN
        RAISE EXCEPTION 'Stock cannot go negative. Part: %, Store: %',
            NEW.part_number, NEW.store_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_negative_stock
    BEFORE UPDATE ON rm_inventory
    FOR EACH ROW EXECUTE FUNCTION fn_prevent_negative_stock();

-- rm_inventory_log: follows legacy naming exactly
-- Positive change_quantity = stock in, Negative = stock out
CREATE TABLE rm_inventory_log (
    log_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number         VARCHAR(100) NOT NULL REFERENCES rm_master(part_number),
    store_id            UUID        REFERENCES store_master(store_id),
    location_type       VARCHAR(20) NOT NULL DEFAULT 'MAIN',
    batch_id            UUID        REFERENCES grn_detail(batch_id),
    balance_before      NUMERIC(14,3) NOT NULL DEFAULT 0,
    -- Explicit snapshot: stock qty BEFORE this transaction (self-contained audit row)
    change_quantity_pcs NUMERIC(14,3) NOT NULL,
    -- Positive = stock in, Negative = stock out (follows legacy pattern)
    new_quantity_after_change NUMERIC(14,3) NOT NULL,
    transaction_type    VARCHAR(30) NOT NULL
        CHECK (transaction_type IN (
            'STOCK_IN',         -- initial receipt
            'PUTAWAY_CONFIRMED',-- after store operator confirms put-away
            'QA_APPROVED',      -- after QC pass
            'QA_REJECTED',      -- moved to rejection
            'CONSUMPTION',      -- production consumption
            'BACKFLUSH',        -- auto-deducted on QA pass
            'TRANSFER',         -- between stores
            'ADJUSTMENT',       -- manual correction
            'RETURN',           -- returned to store
            'SCRAP',            -- written off as scrap
            'RESERVE',          -- reserved for order
            'RESERVE_RELEASE'   -- reservation cancelled
        )),
    reference_type      VARCHAR(50),
    -- 'GRN' | 'PO' | 'BACKFLUSH' | 'MIR' | 'MANUAL' | 'PRODUCTION'
    reference_id        UUID,
    updated_by          UUID        NOT NULL REFERENCES login_users(user_id),
    remarks             TEXT,
    transaction_date    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rm_inv_log_part ON rm_inventory_log(part_number);
CREATE INDEX idx_rm_inv_log_ref  ON rm_inventory_log(reference_type, reference_id);
CREATE INDEX idx_rm_inv_log_at   ON rm_inventory_log USING BRIN(transaction_date);

CREATE TRIGGER trg_rm_inventory_log_immutable
    BEFORE UPDATE OR DELETE ON rm_inventory_log
    FOR EACH ROW EXECUTE FUNCTION fn_block_immutable();

-- put_away_task: operator confirms physical put-away before stock is credited
CREATE TABLE put_away_task (
    task_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id        UUID        NOT NULL REFERENCES grn_detail(batch_id),
    store_id        UUID        NOT NULL REFERENCES store_master(store_id),
    assigned_to     UUID        NOT NULL REFERENCES login_users(user_id),
    suggested_bin   VARCHAR(50),
    confirmed_bin   VARCHAR(50),
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','CANCELLED')),
    qty_to_put_away NUMERIC(14,3) NOT NULL,
    qty_confirmed   NUMERIC(14,3),
    shift_id        UUID        REFERENCES shift_master(shift_id),
    confirmed_by    UUID        REFERENCES login_users(user_id),
    confirmed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_put_away_store  ON put_away_task(store_id)   WHERE status = 'PENDING';
CREATE INDEX idx_put_away_user   ON put_away_task(assigned_to)
    WHERE status IN ('PENDING','IN_PROGRESS');

-- rm_consumption_log: follows legacy naming exactly + audit fields
CREATE TABLE rm_consumption_log (
    log_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number     VARCHAR(100) NOT NULL REFERENCES rm_master(part_number),
    store_id        UUID        REFERENCES store_master(store_id),
    -- Direct store reference for store-wise consumption reports
    qty_used        NUMERIC(14,3) NOT NULL CHECK (qty_used > 0),
    weight_used_kg  NUMERIC(14,3),
    planned_date    DATE,
    usage_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consumption_type VARCHAR(20) NOT NULL DEFAULT 'PLANNED'
        CHECK (consumption_type IN
            ('PLANNED','UNPLANNED','ADJUSTMENT','SCRAP')),
    rm_inventory_log_id UUID    REFERENCES rm_inventory_log(log_id),
    updated_by      UUID        NOT NULL REFERENCES login_users(user_id),
    description     TEXT,
    remarks         TEXT,
    audit_status    VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (audit_status IN
            ('PENDING','CONFIRMED','ADJUSTED','AUTO_CONFIRMED')),
    audited_by      UUID        REFERENCES login_users(user_id),
    audited_at      TIMESTAMPTZ,
    original_qty    NUMERIC(14,3),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rm_consumption_part  ON rm_consumption_log(part_number);
CREATE INDEX idx_rm_consumption_audit ON rm_consumption_log(audit_status)
    WHERE audit_status = 'PENDING';

-- Material Issue Request (MIR)
CREATE TABLE material_issue_request (
    mir_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    mir_number      VARCHAR(50) UNIQUE NOT NULL,
    station_id      UUID        NOT NULL REFERENCES station_master(station_id),
    requested_by    UUID        NOT NULL REFERENCES login_users(user_id),
    store_id        UUID        NOT NULL REFERENCES store_master(store_id),
    mir_status      VARCHAR(25) NOT NULL DEFAULT 'DRAFT'
        CHECK (mir_status IN (
            'DRAFT','SUBMITTED','APPROVED','PARTIAL_APPROVED',
            'REJECTED','PICKING','READY','FULFILLED','CANCELLED'
        )),
    is_non_bom      BOOLEAN     NOT NULL DEFAULT FALSE,
    urgency_note    TEXT,
    approved_by     UUID        REFERENCES login_users(user_id),
    approved_at     TIMESTAMPTZ,
    fulfilled_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_mir_station ON material_issue_request(station_id);
CREATE INDEX idx_mir_status  ON material_issue_request(mir_status)
    WHERE mir_status NOT IN ('FULFILLED','CANCELLED');

CREATE TABLE material_issue_request_details (
    detail_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    mir_id          UUID        NOT NULL
        REFERENCES material_issue_request(mir_id) ON DELETE CASCADE,
    part_number     VARCHAR(100) NOT NULL REFERENCES rm_master(part_number),
    requested_qty   NUMERIC(14,3) NOT NULL CHECK (requested_qty > 0),
    approved_qty    NUMERIC(14,3) NOT NULL DEFAULT 0,
    fulfilled_qty   NUMERIC(14,3) NOT NULL DEFAULT 0,
    rm_inventory_log_id UUID    REFERENCES rm_inventory_log(log_id)
);

-- Shortage forecast (multi-bucket: Day 0 / Day 3 / Day 6 / Month)
CREATE TABLE daily_shortage (
    shortage_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    shortage_date   DATE        NOT NULL,
    part_number     VARCHAR(100) NOT NULL REFERENCES rm_master(part_number),
    day_0           INTEGER     NOT NULL DEFAULT 0,
    day_3           INTEGER     NOT NULL DEFAULT 0,
    day_6           INTEGER     NOT NULL DEFAULT 0,
    day_15          INTEGER     NOT NULL DEFAULT 0,
    net_monthly     INTEGER     NOT NULL DEFAULT 0,
    demand_source   VARCHAR(20) NOT NULL DEFAULT 'PRODUCTION'
        CHECK (demand_source IN ('PRODUCTION','CLIENT_SCHEDULE','MANUAL')),
    calculated_by   UUID        REFERENCES login_users(user_id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shortage_date, part_number, demand_source)
);
CREATE INDEX idx_daily_shortage_part ON daily_shortage(part_number, shortage_date);

-- demand_forecast: follows legacy naming exactly
CREATE TABLE demand_forecast (
    forecast_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_date   DATE        NOT NULL,
    part_number     VARCHAR(100) NOT NULL REFERENCES rm_master(part_number),
    qty_8_days_pcs  INTEGER     NOT NULL DEFAULT 0,
    qty_15_days_pcs INTEGER     NOT NULL DEFAULT 0,
    qty_25_days_pcs INTEGER     NOT NULL DEFAULT 0,
    qty_month_pcs   INTEGER     NOT NULL DEFAULT 0,
    client_ref      VARCHAR(100),
    created_by      UUID        NOT NULL REFERENCES login_users(user_id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- rm_planning: follows legacy naming exactly
CREATE TABLE rm_planning (
    planning_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number     VARCHAR(100) NOT NULL REFERENCES rm_master(part_number),
    planning_date   DATE        NOT NULL,
    till_day3_qty   INTEGER     NOT NULL DEFAULT 0,
    till_day6_qty   INTEGER     NOT NULL DEFAULT 0,
    till_month_qty  INTEGER     NOT NULL DEFAULT 0,
    last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 16 — QA & REJECTION
-- ============================================================

CREATE TABLE checklist_master (
    template_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code   VARCHAR(100) UNIQUE NOT NULL,
    template_name   VARCHAR(255) NOT NULL,
    checklist_type  VARCHAR(30) NOT NULL,
    applicable_to   VARCHAR(50),
    version         INTEGER     NOT NULL DEFAULT 1,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    superseded_by   UUID        REFERENCES checklist_master(template_id),
    created_by      UUID        REFERENCES login_users(user_id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE checklist_items (
    item_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID        NOT NULL REFERENCES checklist_master(template_id),
    item_code       VARCHAR(100) NOT NULL,
    item_text       TEXT        NOT NULL,
    is_mandatory    BOOLEAN     NOT NULL DEFAULT TRUE,
    allows_na       BOOLEAN     NOT NULL DEFAULT FALSE,
    sequence_no     INTEGER     NOT NULL,
    block_type      VARCHAR(25) NOT NULL DEFAULT 'VISUAL'
        CHECK (block_type IN (
            'SCAN_MATCH','QUANTITY_CHECK','VISUAL',
            'DOCUMENT_CHECK','PHOTO','FREE_TEXT','SIGNATURE'
        )),
    max_defect_points INTEGER   NOT NULL DEFAULT 0,
    UNIQUE (template_id, sequence_no)
);

CREATE TABLE checklist_log (
    log_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID        NOT NULL REFERENCES checklist_master(template_id),
    template_version INTEGER    NOT NULL,
    reference_type  VARCHAR(20) NOT NULL,
    reference_id    UUID        NOT NULL,
    completed_by    UUID        NOT NULL REFERENCES login_users(user_id),
    approved_by     UUID        REFERENCES login_users(user_id),
    overall_result  VARCHAR(5)  CHECK (overall_result IN ('PASS','FAIL',NULL)),
    total_defect_points INTEGER NOT NULL DEFAULT 0,
    completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_checklist_log_ref ON checklist_log(reference_type, reference_id);

CREATE TABLE checklist_item_log (
    item_log_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_log_id UUID       NOT NULL REFERENCES checklist_log(log_id),
    item_id         UUID        NOT NULL REFERENCES checklist_items(item_id),
    result          VARCHAR(5)  NOT NULL CHECK (result IN ('PASS','FAIL','NA')),
    remarks         TEXT,
    defect_points   INTEGER     NOT NULL DEFAULT 0,
    severity        VARCHAR(10)
        CHECK (severity IN ('MINOR','MAJOR','CRITICAL','SAFETY',NULL)),
    media_path      TEXT,
    scanned_value   VARCHAR(255),
    entered_qty     NUMERIC(14,3),
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (checklist_log_id, item_id)
);

-- qa_master: follows legacy naming exactly
CREATE TABLE qa_master (
    qa_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    qa_name         VARCHAR(255) NOT NULL,
    user_id         UUID        UNIQUE REFERENCES login_users(user_id),
    certification_name VARCHAR(255),
    certification_ref  VARCHAR(100),
    certification_expiry DATE,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE
);

-- Incoming QA inspection (GRN batch level)
CREATE TABLE qa_incoming_log (
    log_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_no   VARCHAR(100) UNIQUE NOT NULL,
    batch_id        UUID        NOT NULL REFERENCES grn_detail(batch_id),
    inspector_id    UUID        NOT NULL REFERENCES login_users(user_id),
    checklist_log_id UUID       REFERENCES checklist_log(log_id),
    qa_decision     VARCHAR(25)
        CHECK (qa_decision IN (
            'ACCEPT','ACCEPT_CERT_PENDING','ACCEPT_PARTIAL','HOLD','REJECT'
        )),
    qty_accepted    NUMERIC(14,3),
    qty_rejected    NUMERIC(14,3),
    hold_reason     TEXT,
    rejection_reason TEXT,
    approved_by     UUID        REFERENCES login_users(user_id),
    inspected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_qa_incoming_batch ON qa_incoming_log(batch_id);

-- inspection_documents: follows legacy pattern with _log suffix
CREATE TABLE inspection_documents (
    doc_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id   UUID        NOT NULL REFERENCES qa_incoming_log(log_id),
    doc_type        VARCHAR(30) NOT NULL
        CHECK (doc_type IN (
            'VENDOR_CERT','HV_SAFETY_CERT','MATERIAL_CERT',
            'TEST_REPORT','DIMENSION_REPORT','OTHER'
        )),
    file_path       TEXT        NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    doc_status      VARCHAR(20) NOT NULL DEFAULT 'UPLOADED'
        CHECK (doc_status IN ('UPLOADED','APPROVED','REJECTED')),
    reviewed_by     UUID        REFERENCES login_users(user_id),
    reviewed_at     TIMESTAMPTZ,
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rejection reason master: follows _master naming
CREATE TABLE rejection_reason_master (
    reason_code     VARCHAR(50)  PRIMARY KEY,
    reason_name     VARCHAR(150) NOT NULL,
    requires_free_text BOOLEAN   NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE
);

INSERT INTO rejection_reason_master (reason_code, reason_name, requires_free_text) VALUES
    ('DIM_OUT_OF_SPEC',   'Dimensions out of specification',  FALSE),
    ('SURFACE_DEFECT',    'Surface defect / scratch / dent',  FALSE),
    ('WRONG_COLOUR',      'Wrong colour or finish',           FALSE),
    ('MATERIAL_MISMATCH', 'Wrong material or grade',          FALSE),
    ('QTY_SHORT',         'Quantity short vs invoice',        FALSE),
    ('QTY_EXCESS',        'Quantity excess vs PO',            FALSE),
    ('DAMAGED_TRANSIT',   'Damaged in transit',               FALSE),
    ('CERT_MISSING',      'Certificate missing',              FALSE),
    ('CERT_INVALID',      'Certificate expired or invalid',   FALSE),
    ('WRONG_PART',        'Wrong part number supplied',       FALSE),
    ('FUNCTIONAL_FAIL',   'Functional or fit failure',        TRUE),
    ('OTHER',             'Other — specify',                  TRUE)
ON CONFLICT (reason_code) DO NOTHING;

-- rejection_log: groups batch rejections into one vendor notification
CREATE TABLE rejection_log (
    rejection_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    rln             VARCHAR(80) UNIQUE NOT NULL,
    -- RLN-YYYY-NNNN
    grn_id          UUID        REFERENCES rm_receiving_log(grn_id),
    vendor_id       UUID        NOT NULL REFERENCES vendor_master(vendor_id),
    reason_code     VARCHAR(50) REFERENCES rejection_reason_master(reason_code),
    description     TEXT,
    status          VARCHAR(35) NOT NULL DEFAULT 'QUARANTINE_HOLD'
        CHECK (status IN (
            'QUARANTINE_HOLD','VENDOR_NOTIFIED','VENDOR_RESPONDED',
            'RETURN_APPROVED','VENDOR_COLLECTING','PLANT_DISPATCHING',
            'RETURN_IN_TRANSIT','RETURN_CONFIRMED','REPLACEMENT_AWAITED',
            'REPLACEMENT_RECEIVED','WRITE_OFF_APPROVED',
            'ACCEPTED_CONCESSION','CLOSED'
        )),
    return_option   VARCHAR(25)
        CHECK (return_option IN ('VENDOR_COLLECTING','PLANT_DISPATCHING',NULL)),
    total_lines     SMALLINT    NOT NULL DEFAULT 0,
    total_qty       NUMERIC(14,3) NOT NULL DEFAULT 0,
    disposition_deadline TIMESTAMPTZ,
    notified_at     TIMESTAMPTZ,
    vendor_response VARCHAR(20)
        CHECK (vendor_response IN ('WILL_REPLACE','WILL_COLLECT','DISPUTE',NULL)),
    vendor_responded_at TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ,
    created_by      UUID        NOT NULL REFERENCES login_users(user_id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rejection_log_vendor ON rejection_log(vendor_id);
CREATE INDEX idx_rejection_log_status ON rejection_log(status)
    WHERE status != 'CLOSED';

CREATE TABLE rejection_log_details (
    detail_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    rejection_id    UUID        NOT NULL REFERENCES rejection_log(rejection_id),
    batch_id        UUID        NOT NULL REFERENCES grn_detail(batch_id),
    qty_rejected    NUMERIC(14,3) NOT NULL,
    reason_override VARCHAR(50) REFERENCES rejection_reason_master(reason_code),
    description     TEXT
);

CREATE TABLE rejection_photos (
    photo_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    rejection_id    UUID        NOT NULL REFERENCES rejection_log(rejection_id),
    file_path       TEXT        NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    uploaded_by     UUID        NOT NULL REFERENCES login_users(user_id),
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rejection_lifecycle_log (
    log_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    rejection_id    UUID        NOT NULL REFERENCES rejection_log(rejection_id),
    from_status     VARCHAR(35),
    to_status       VARCHAR(35) NOT NULL,
    changed_by      UUID        NOT NULL REFERENCES login_users(user_id),
    change_reason   TEXT,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_rejection_lifecycle_immutable
    BEFORE UPDATE OR DELETE ON rejection_lifecycle_log
    FOR EACH ROW EXECUTE FUNCTION fn_block_immutable();

-- ncr_log: Non-Conformance Report (raised from rejection_log)
CREATE TABLE ncr_log (
    ncr_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ncr_number      VARCHAR(100) UNIQUE NOT NULL,
    rejection_id    UUID        REFERENCES rejection_log(rejection_id),
    vendor_id       UUID        NOT NULL REFERENCES vendor_master(vendor_id),
    defect_description TEXT     NOT NULL,
    disposition_code VARCHAR(30)
        CHECK (disposition_code IN (
            'RETURN_TO_VENDOR','SCRAP_AT_SITE','REWORK_ACCEPTED',
            'USE_AS_IS','DEBIT_NOTE_RAISED',NULL
        )),
    status          VARCHAR(30) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN (
            'OPEN','NOTICE_SENT','ACKNOWLEDGED','CAR_SUBMITTED',
            'CAR_ACCEPTED','CAR_REVISION_REQUESTED','RESOLVED','ESCALATED'
        )),
    acknowledgement_due TIMESTAMPTZ,
    car_due         TIMESTAMPTZ,
    raised_by       UUID        NOT NULL REFERENCES login_users(user_id),
    resolved_by     UUID        REFERENCES login_users(user_id),
    resolution_note TEXT,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ncr_log_vendor ON ncr_log(vendor_id);
CREATE INDEX idx_ncr_log_open   ON ncr_log(status) WHERE status != 'RESOLVED';

-- debit_note: follows legacy _log naming converted to formal document
CREATE TABLE debit_note (
    debit_note_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    debit_note_no   VARCHAR(80) UNIQUE NOT NULL,
    vendor_id       UUID        NOT NULL REFERENCES vendor_master(vendor_id),
    rejection_id    UUID        REFERENCES rejection_log(rejection_id),
    reason_type     VARCHAR(25) NOT NULL
        CHECK (reason_type IN (
            'DEFECTIVE_GOODS','EXCESS_QUANTITY',
            'PRICE_DISCREPANCY','GOODS_RETURN','OTHER'
        )),
    description     TEXT        NOT NULL,
    debit_amount    NUMERIC(14,2) NOT NULL,
    gst_amount      NUMERIC(12,2),
    total_amount    NUMERIC(14,2),
    status          VARCHAR(25) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN (
            'DRAFT','ISSUED','ACKNOWLEDGED',
            'CREDIT_RECEIVED','SETTLED','DISPUTED'
        )),
    issued_by       UUID        REFERENCES login_users(user_id),
    issued_at       TIMESTAMPTZ,
    tally_ref       VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_debit_note_vendor ON debit_note(vendor_id);

-- ============================================================
-- SECTION 17 — SUPPLIER PORTAL
-- ============================================================

CREATE TABLE vendor_portal_log (
    log_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID        NOT NULL REFERENCES vendor_master(vendor_id),
    session_token   VARCHAR(128) UNIQUE NOT NULL,
    otp_verified    BOOLEAN     NOT NULL DEFAULT FALSE,
    ip_address      INET,
    device_info     TEXT,
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    invalidated_at  TIMESTAMPTZ
);
CREATE INDEX idx_vendor_portal_token ON vendor_portal_log(session_token)
    WHERE invalidated_at IS NULL;

CREATE TABLE asn_log (
    asn_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    asn_number      VARCHAR(50) UNIQUE NOT NULL,
    po_id           UUID        NOT NULL REFERENCES rm_purchase_order(po_id),
    vendor_id       UUID        NOT NULL REFERENCES vendor_master(vendor_id),
    status          VARCHAR(15) NOT NULL DEFAULT 'SUBMITTED'
        CHECK (status IN ('SUBMITTED','CONFIRMED','EXPIRED')),
    expected_date   DATE        NOT NULL,
    arrival_window  VARCHAR(30),
    vehicle_number  VARCHAR(30),
    driver_name     VARCHAR(100),
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE asn_details (
    detail_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    asn_id          UUID        NOT NULL REFERENCES asn_log(asn_id) ON DELETE CASCADE,
    po_detail_id    UUID        REFERENCES rm_purchase_order_details(po_detail_id),
    part_number     VARCHAR(100) NOT NULL,
    qty_shipped     NUMERIC(14,3) NOT NULL,
    vendor_batch_ref VARCHAR(50)
);

-- Update gate_entry ASN FK now asn_log exists
ALTER TABLE gate_log ADD COLUMN asn_id UUID REFERENCES asn_log(asn_id);

CREATE TABLE vendor_portal_action_log (
    action_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID        NOT NULL REFERENCES vendor_master(vendor_id),
    session_id      UUID        REFERENCES vendor_portal_log(log_id),
    action_type     VARCHAR(30) NOT NULL
        CHECK (action_type IN (
            'PO_ACKNOWLEDGE','PO_DECLINE','ASN_SUBMIT','DOC_UPLOAD',
            'REJECTION_ACKNOWLEDGE','CAR_SUBMIT','DELIVERY_CONFIRM',
            'DISPUTE_RAISE','SCORECARD_VIEW'
        )),
    entity_type     VARCHAR(30),
    entity_id       UUID,
    details         JSONB,
    performed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vendor_action_log_vendor ON vendor_portal_action_log(vendor_id);
CREATE TRIGGER trg_vendor_action_log_immutable
    BEFORE UPDATE OR DELETE ON vendor_portal_action_log
    FOR EACH ROW EXECUTE FUNCTION fn_block_immutable();

CREATE TABLE vendor_dispute_log (
    dispute_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID        NOT NULL REFERENCES vendor_master(vendor_id),
    ncr_id          UUID        REFERENCES ncr_log(ncr_id),
    grn_id          UUID        REFERENCES rm_receiving_log(grn_id),
    dispute_type    VARCHAR(40) NOT NULL,
    description     TEXT        NOT NULL,
    status          VARCHAR(10) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN','UPHELD','REVISED','CLOSED')),
    resolved_by     UUID        REFERENCES login_users(user_id),
    resolution_note TEXT,
    raised_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

-- ============================================================
-- SECTION 18 — DISPATCH
-- ============================================================

CREATE TABLE dispatch_notes (
    dispatch_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_no         VARCHAR(80) UNIQUE NOT NULL,
    production_unit_ref VARCHAR(150) NOT NULL,
    entity_type         VARCHAR(10) NOT NULL
        CHECK (entity_type IN ('VIN','CHASSIS','PART_LOT')),
    buyer_name          VARCHAR(255) NOT NULL,
    buyer_gstin         VARCHAR(20),
    customer_po_ref     VARCHAR(100),
    truck_id            UUID        REFERENCES truck_master(truck_id),
    driver_id           UUID        REFERENCES driver_master(driver_id),
    vehicle_number      VARCHAR(30),
    driver_name         VARCHAR(100),
    dispatch_date       DATE,
    gate_out_time       TIMESTAMPTZ,
    gate_log_id         UUID        REFERENCES gate_log(gate_log_id),
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN (
            'PENDING','CLEARANCE_CHECK','DOCUMENTS_READY',
            'APPROVED','DISPATCHED','DELIVERED'
        )),
    invoice_id          UUID,
    dispatch_officer    UUID        NOT NULL REFERENCES login_users(user_id),
    approved_by         UUID        REFERENCES login_users(user_id),
    approved_at         TIMESTAMPTZ,
    pin_confirmed_by    UUID        REFERENCES login_users(user_id),
    pin_confirmed_at    TIMESTAMPTZ,
    delivery_confirmed_at TIMESTAMPTZ,
    is_received_by_client BOOLEAN   NOT NULL DEFAULT FALSE,
    json_snapshot       JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (production_unit_ref, entity_type)
);
CREATE INDEX idx_dispatch_notes_status ON dispatch_notes(status)
    WHERE status != 'DISPATCHED';

CREATE TABLE dispatch_documents (
    doc_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id     UUID        NOT NULL REFERENCES dispatch_notes(dispatch_id),
    doc_type        VARCHAR(30) NOT NULL
        CHECK (doc_type IN (
            'RELEASE_NOTE','TAX_INVOICE','WARRANTY_CARD',
            'VEHICLE_HISTORY','DELIVERY_CHALLAN',
            'INSURANCE','ROUTE_PERMIT','RC_COPY','EOL_CERTIFICATE'
        )),
    doc_number      VARCHAR(100),
    source          VARCHAR(15) NOT NULL DEFAULT 'AUTO_GENERATED'
        CHECK (source IN ('AUTO_GENERATED','UPLOADED')),
    is_mandatory    BOOLEAN     NOT NULL DEFAULT TRUE,
    file_path       TEXT,
    generated_at    TIMESTAMPTZ,
    uploaded_by     UUID        REFERENCES login_users(user_id),
    uploaded_at     TIMESTAMPTZ
);

CREATE TABLE dispatch_clearance_log (
    log_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id     UUID        NOT NULL REFERENCES dispatch_notes(dispatch_id),
    condition_code  VARCHAR(80) NOT NULL,
    result          VARCHAR(5)  NOT NULL CHECK (result IN ('PASS','FAIL')),
    failure_detail  TEXT,
    checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE warranty_log (
    warranty_id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id         UUID    NOT NULL REFERENCES dispatch_notes(dispatch_id),
    production_unit_ref VARCHAR(150) NOT NULL,
    warranty_category   VARCHAR(30) NOT NULL,
    duration_months     INTEGER NOT NULL DEFAULT 18,
    duration_km         INTEGER,
    start_date          DATE    NOT NULL,
    expiry_date         DATE,
    status              VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE','EXPIRED','CLAIMED')),
    alert_60d_sent      BOOLEAN NOT NULL DEFAULT FALSE,
    alert_30d_sent      BOOLEAN NOT NULL DEFAULT FALSE,
    alert_7d_sent       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_warranty_log_unit   ON warranty_log(production_unit_ref);
CREATE INDEX idx_warranty_log_expiry ON warranty_log(expiry_date)
    WHERE status = 'ACTIVE';

CREATE TABLE warranty_claim_log (
    claim_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_number    VARCHAR(80) UNIQUE NOT NULL,
    dispatch_id     UUID        NOT NULL REFERENCES dispatch_notes(dispatch_id),
    warranty_id     UUID        REFERENCES warranty_log(warranty_id),
    claimed_by      VARCHAR(255) NOT NULL,
    claim_date      DATE        NOT NULL,
    is_within_warranty BOOLEAN,
    defect_description TEXT     NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN (
            'OPEN','UNDER_REVIEW','APPROVED',
            'REJECTED','PARTS_DISPATCHED','CLOSED'
        )),
    estimated_cost  NUMERIC(12,2),
    final_cost      NUMERIC(12,2),
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 19 — MOVEMENT LOG
-- ============================================================

CREATE TABLE unit_movement_log (
    log_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    production_unit_ref VARCHAR(150) NOT NULL,
    entity_type         VARCHAR(10) NOT NULL
        CHECK (entity_type IN ('VIN','CHASSIS','SERIAL')),
    from_status         VARCHAR(50),
    to_status           VARCHAR(50) NOT NULL,
    from_station_id     UUID        REFERENCES station_master(station_id),
    to_station_id       UUID        REFERENCES station_master(station_id),
    event_type          VARCHAR(20) NOT NULL
        CHECK (event_type IN (
            'STATION_ENTRY','STATION_EXIT','STATUS_CHANGE',
            'QA_EVENT','OVERRIDE_EVENT'
        )),
    recorded_by         UUID        NOT NULL REFERENCES login_users(user_id),
    details             JSONB,
    event_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_unit_movement_unit ON unit_movement_log(production_unit_ref, entity_type);
CREATE INDEX idx_unit_movement_at   ON unit_movement_log USING BRIN(event_at);
CREATE TRIGGER trg_unit_movement_immutable
    BEFORE UPDATE OR DELETE ON unit_movement_log
    FOR EACH ROW EXECUTE FUNCTION fn_block_immutable();

-- scrap_tracking: follows legacy naming exactly
CREATE TABLE scrap_tracking (
    scrap_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id      UUID        REFERENCES station_master(station_id),
    part_number     VARCHAR(100) REFERENCES rm_master(part_number),
    production_unit_ref VARCHAR(150),
    qty_scrapped    NUMERIC(14,3) NOT NULL CHECK (qty_scrapped > 0),
    scrap_weight_kg NUMERIC(10,3),
    scrap_reason    VARCHAR(30) NOT NULL
        CHECK (scrap_reason IN (
            'QA_FAIL','DIMENSIONAL_ERROR','MATERIAL_DEFECT',
            'OPERATOR_ERROR','MACHINE_ERROR','DAMAGE','OTHER'
        )),
    recorded_by     UUID        NOT NULL REFERENCES login_users(user_id),
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    remarks         TEXT
);
CREATE INDEX idx_scrap_tracking_station ON scrap_tracking(station_id);
CREATE INDEX idx_scrap_tracking_part    ON scrap_tracking(part_number);

-- ============================================================
-- SECTION 20 — ADMIN MODULE
-- ============================================================

CREATE TABLE module_admin_mapping (
    mapping_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    module_name     VARCHAR(50) NOT NULL,
    admin_user_id   UUID        NOT NULL REFERENCES login_users(user_id),
    delegated_by    UUID        NOT NULL REFERENCES login_users(user_id),
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_module_admin_mapping ON module_admin_mapping(module_name, admin_user_id) WHERE is_active = TRUE;

CREATE TABLE module_admin_action_log (
    log_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    module_name     VARCHAR(50) NOT NULL,
    action          VARCHAR(10) NOT NULL CHECK (action IN ('GRANT','REVOKE')),
    target_user_id  UUID        NOT NULL REFERENCES login_users(user_id),
    performed_by    UUID        NOT NULL REFERENCES login_users(user_id),
    performed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_module_admin_action_immutable
    BEFORE UPDATE OR DELETE ON module_admin_action_log
    FOR EACH ROW EXECUTE FUNCTION fn_block_immutable();

-- ============================================================
-- SECTION 21 — SEQUENCES & MIGRATIONS
-- ============================================================

CREATE SEQUENCE seq_grn_number           START 1 INCREMENT 1;
CREATE SEQUENCE seq_po_number            START 1 INCREMENT 1;
CREATE SEQUENCE seq_ncr_number           START 1 INCREMENT 1;
CREATE SEQUENCE seq_rln_number           START 1 INCREMENT 1;
CREATE SEQUENCE seq_gate_log_number      START 1 INCREMENT 1;
CREATE SEQUENCE seq_mir_number           START 1 INCREMENT 1;
CREATE SEQUENCE seq_debit_note_number    START 1 INCREMENT 1;
CREATE SEQUENCE seq_warranty_claim_no    START 1 INCREMENT 1;

-- Role seed (minimum required)
INSERT INTO role_master (role_code, role_name, description) VALUES
    ('ADMIN',        'Admin',                'Full system access'),
    ('SUPER_ADMIN',  'Super Admin',          'Platform-level access'),
    ('SUPERVISOR',   'Supervisor',           'Operations supervision and overrides'),
    ('RM_MANAGER',   'RM Manager',           'Raw material procurement and planning'),
    ('RM_AUDITOR',   'RM Auditor',           'Confirms actual vs planned RM consumption'),
    ('OPERATOR',     'Operator',             'Station work and production'),
    ('STORE_OP',     'Store Operator',       'GRN receipt, put-away, inventory'),
    ('QA_OPERATOR',  'QA Operator',          'Quality inspection and logging'),
    ('QA_MANAGER',   'Quality Manager',      'QA oversight, NCR management'),
    ('PROD_MANAGER', 'Production Manager',   'Production oversight and planning'),
    ('PPC',          'PPC',                  'Production Planning & Control'),
    ('DISPATCH_OP',  'Dispatch Operator',    'Dispatch and delivery operations'),
    ('FINANCE',      'Finance',              'Invoicing, 3-way match, Tally export')
ON CONFLICT (role_code) DO NOTHING;

INSERT INTO schema_migrations VALUES
    ('1.0.0', 'shared.sql — initial schema', NOW())
ON CONFLICT (version) DO NOTHING;

-- ============================================================
-- END shared.sql
-- ============================================================


-- ===== COMBINED WITH AUDI =====

-- ============================================================
-- ASTUTE BRIDGE ERP
-- FILE: audi.sql
-- PURPOSE: Audi Automobiles (Bhagirath Brothers) plugin tables
-- RUN AFTER: shared.sql  (v2.0)
-- DATABASE: audi_bus_erp
-- NAMING: Follows erp_audi-38.sql naming conventions
-- ============================================================

-- ============================================================
-- SECTION 1 — DEALER & ORDER MASTER
-- ============================================================

CREATE TABLE dealer_master (
    dealer_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_code     VARCHAR(50) UNIQUE NOT NULL,
    dealer_name     VARCHAR(255) NOT NULL,
    dealer_type     VARCHAR(20) NOT NULL DEFAULT 'DEALER'
        CHECK (dealer_type IN
            ('DEALER','PRIVATE','INSTITUTIONAL','VECV_COCO')),
    oem_brand       VARCHAR(50) NOT NULL DEFAULT 'EICHER',
    city            VARCHAR(100),
    state           VARCHAR(50),
    address         TEXT,
    contact_name    VARCHAR(255),
    contact_mobile  VARCHAR(20),
    contact_email   VARCHAR(255),
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- body_type_master: body style lookup (SKYLINE, STARLINE, LEGACY etc.)
CREATE TABLE body_type_master (
    body_type_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    body_type_code  VARCHAR(50) UNIQUE NOT NULL,
    body_type_name  VARCHAR(100) NOT NULL,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE
);

INSERT INTO body_type_master (body_type_code, body_type_name) VALUES
    ('SKYLINE',        'Skyline'),
    ('STARLINE',       'Starline'),
    ('STARLINE_NF',    'Starline New Face'),
    ('LEGACY',         'Legacy'),
    ('LEGACY_VECV',    'Legacy VECV'),
    ('LEGACY_GEN4',    'Legacy Gen4'),
    ('LEGACY_CNG',     'Legacy CNG'),
    ('PRO_WIDER',      'Pro Wider'),
    ('PRO_AMTS',       'Pro AMTS'),
    ('PRO_FACE',       'Pro Face'),
    ('HD_FACE',        'HD Face'),
    ('NEW_STARLINE',   'New Starline'),
    ('SKY_2026',       '2026 Skyline'),
    ('STR_2026',       '2026 Starline')
ON CONFLICT (body_type_code) DO NOTHING;

-- fert_master: finished goods / bus model definitions
CREATE TABLE fert_master (
    fert_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    fert_code       VARCHAR(50) UNIQUE NOT NULL,
    fert_name       VARCHAR(255) NOT NULL,
    bus_type        VARCHAR(20) NOT NULL
        CHECK (bus_type IN
            ('SCHOOL_BUS','STAFF_BUS','CUSTOM','GOVERNMENT','HD')),
    seating_capacity INTEGER,
    model_code      VARCHAR(20),
    body_type_id    UUID        REFERENCES body_type_master(body_type_id),
    base_bom_version VARCHAR(20) NOT NULL,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CPQ features (AC, GPS, FAPS brand, double door etc.)
CREATE TABLE dynamic_features (
    feature_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_code    VARCHAR(50) UNIQUE NOT NULL,
    feature_name    VARCHAR(100) NOT NULL,
    feature_type    VARCHAR(15) NOT NULL
        CHECK (feature_type IN ('BOOLEAN','SELECTION')),
    cpq_key         VARCHAR(50) UNIQUE NOT NULL,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE
);

INSERT INTO dynamic_features (feature_code, feature_name, feature_type, cpq_key) VALUES
    ('AC',           'Air Conditioning',         'BOOLEAN', 'ac_required'),
    ('GPS',          'GPS Tracking System',      'BOOLEAN', 'gps'),
    ('DCLOCK',       'Digital Dashboard Clock',  'BOOLEAN', 'digital_clock'),
    ('CSEATING',     'Custom Seating Layout',    'BOOLEAN', 'custom_seating'),
    ('CGFX',         'Custom Graphics/Livery',   'BOOLEAN', 'custom_graphics'),
    ('FAPS_SAFEX',   'FAPS System - Safex Fire', 'BOOLEAN', 'faps_safex'),
    ('FAPS_SWASTIK', 'FAPS System - Swastik',    'BOOLEAN', 'faps_swastik'),
    ('DD',           'Double Door',              'BOOLEAN', 'double_door'),
    ('VLTS',         'VLTS Safety System',       'BOOLEAN', 'vlts_required')
ON CONFLICT (feature_code) DO NOTHING;

-- Feature-BOM additions (when feature is active, add these parts)
CREATE TABLE feature_bom (
    feature_bom_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id      UUID        NOT NULL REFERENCES dynamic_features(feature_id),
    fert_id         UUID        NOT NULL REFERENCES fert_master(fert_id),
    part_number     VARCHAR(100) NOT NULL REFERENCES rm_master(part_number),
    part_name       VARCHAR(255) NOT NULL,
    station_id      UUID        NOT NULL REFERENCES station_master(station_id),
    qty_per_bus     NUMERIC(14,3) NOT NULL CHECK (qty_per_bus > 0),
    uom             VARCHAR(20) NOT NULL DEFAULT 'NOS',
    UNIQUE (feature_id, fert_id, part_number, station_id)
);
CREATE INDEX idx_feature_bom_fert ON feature_bom(fert_id);

-- order_details: customer/dealer order with CPQ config
CREATE TABLE order_details (
    order_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number    VARCHAR(50) UNIQUE NOT NULL,
    dealer_id       UUID        REFERENCES dealer_master(dealer_id),
    fert_id         UUID        NOT NULL REFERENCES fert_master(fert_id),
    cpq_config      JSONB       NOT NULL DEFAULT '{}',
    -- {"ac_required":true,"gps":false,"faps_safex":true,"double_door":false}
    faps_supplier   VARCHAR(50),
    faps_model      VARCHAR(50),
    seat_supplier   VARCHAR(100),
    mbom_generated  BOOLEAN     NOT NULL DEFAULT FALSE,
    mbom_snapshot   JSONB,
    order_status    VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED'
        CHECK (order_status IN (
            'CONFIRMED','MBOM_GENERATED','IN_PRODUCTION',
            'DISPATCH_READY','DISPATCHED','CANCELLED'
        )),
    customer_name   VARCHAR(255),
    customer_contact VARCHAR(100),
    delivery_due_date DATE,
    special_requirements TEXT,
    created_by      UUID        NOT NULL REFERENCES login_users(user_id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_details_status ON order_details(order_status)
    WHERE order_status NOT IN ('DISPATCHED','CANCELLED');
CREATE INDEX idx_order_details_fert   ON order_details(fert_id);
CREATE INDEX idx_order_details_cpq    ON order_details USING GIN(cpq_config);

-- customer advance / order payment tracking (from VECV ADVANCE sheet)
CREATE TABLE customer_advance (
    advance_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID        REFERENCES order_details(order_id),
    dealer_id       UUID        NOT NULL REFERENCES dealer_master(dealer_id),
    po_reference    VARCHAR(100),
    po_item_number  INTEGER,
    fert_code       VARCHAR(50),
    halb_code       VARCHAR(50),
    taxable_amount  NUMERIC(14,2) NOT NULL,
    cgst_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    sgst_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    igst_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount    NUMERIC(14,2) NOT NULL,
    advance_status  VARCHAR(15) NOT NULL DEFAULT 'PENDING'
        CHECK (advance_status IN ('PENDING','RECEIVED','ADJUSTED','REFUNDED')),
    received_date   DATE,
    asn_number      VARCHAR(50),
    tally_ref       VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_customer_advance_dealer ON customer_advance(dealer_id);

-- ============================================================
-- SECTION 2 — STATION MASTER EXTENSIONS (Audi-specific)
-- ============================================================

-- Seed Audi's 16 production stations
INSERT INTO station_master
    (station_code, station_name, station_description, sequence_no,
     requires_qa, is_external_station, is_conditional, condition_key,
     backflush_enabled, station_model)
VALUES
    ('STN-01','Chassis Preparation', 'Initial chassis prep',            1,  TRUE,  FALSE, FALSE, NULL,          TRUE, 'MULTI_OPERATOR'),
    ('STN-02','Under Frame',         'Under frame fabrication',         2,  TRUE,  FALSE, FALSE, NULL,          TRUE, 'MULTI_OPERATOR'),
    ('STN-03','Side Wall Fab',       'Side wall fabrication',           3,  TRUE,  FALSE, FALSE, NULL,          TRUE, 'MULTI_OPERATOR'),
    ('STN-04','Roof Fabrication',    'Roof frame fabrication',          4,  TRUE,  FALSE, FALSE, NULL,          TRUE, 'MULTI_OPERATOR'),
    ('STN-05','Body Panelling',      'Outer panel fitment',             5,  TRUE,  FALSE, FALSE, NULL,          TRUE, 'MULTI_OPERATOR'),
    ('STN-06','Priming',             'Surface prep and priming',        6,  TRUE,  FALSE, FALSE, NULL,          TRUE, 'MULTI_OPERATOR'),
    ('STN-07','Painting',            'Painting and finishing',          7,  TRUE,  FALSE, FALSE, NULL,          TRUE, 'MULTI_OPERATOR'),
    ('STN-08','AC Fitment',          'AC unit fitment (external)',      8,  TRUE,  TRUE,  TRUE,  'ac_required', TRUE, 'MULTI_OPERATOR'),
    ('STN-09','Electrical Wiring',   'Electrical harness and wiring',   9,  TRUE,  FALSE, FALSE, NULL,          TRUE, 'MULTI_OPERATOR'),
    ('STN-10','Flooring',            'Flooring material fitment',       10, TRUE,  FALSE, FALSE, NULL,          TRUE, 'MULTI_OPERATOR'),
    ('STN-11','Seating',             'Seat fitment and upholstery',     11, TRUE,  FALSE, FALSE, NULL,          TRUE, 'MULTI_OPERATOR'),
    ('STN-12','Glazing & Windows',   'Window glass and frames',         12, TRUE,  FALSE, FALSE, NULL,          TRUE, 'MULTI_OPERATOR'),
    ('STN-13','Finishing',           'Trim and accessories',            13, TRUE,  FALSE, FALSE, NULL,          TRUE, 'MULTI_OPERATOR'),
    ('STN-14','Trimming',            'Final interior trimming',         14, TRUE,  FALSE, FALSE, NULL,          TRUE, 'MULTI_OPERATOR'),
    ('STN-15','Shower Test',         'Water leakage test',              15, TRUE,  FALSE, FALSE, NULL,          FALSE,'MULTI_OPERATOR'),
    ('STN-16','FVI / PDI',           'Final vehicle and pre-delivery',  16, TRUE,  FALSE, FALSE, NULL,          FALSE,'MULTI_OPERATOR')
ON CONFLICT (station_code) DO NOTHING;

-- station_fert_cycle_time: per-FERT cycle time override per station
CREATE TABLE station_fert_cycle_time (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id      UUID        NOT NULL REFERENCES station_master(station_id),
    fert_code       VARCHAR(50) NOT NULL,
    cycle_time_override_min INTEGER NOT NULL,
    notes           TEXT,
    UNIQUE (station_id, fert_code)
);

-- station_floor_buffer_config: auto-MIR trigger per station per part
CREATE TABLE station_floor_buffer_config (
    config_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id      UUID        NOT NULL REFERENCES station_master(station_id),
    part_number     VARCHAR(100) NOT NULL REFERENCES rm_master(part_number),
    buffer_buses_qty INTEGER    NOT NULL DEFAULT 1,
    auto_mir_enabled BOOLEAN    NOT NULL DEFAULT TRUE,
    UNIQUE (station_id, part_number)
);

-- ============================================================
-- SECTION 3 — CHASSIS GATE & INDUCTION (34-acre yard plant)
-- ============================================================
-- NOTE: This is COMPLETELY SEPARATE from the shared gate_log / rm_receiving_log.
-- Chassis arrive at the 34-acre yard plant (different physical location).
-- Materials arrive at production plant (handled by shared gate_log).

CREATE TABLE chassis_ledger (
    chassis_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    chassis_number  VARCHAR(150) UNIQUE NOT NULL,
    engine_number   VARCHAR(150),
    dealer_id       UUID        REFERENCES dealer_master(dealer_id),
    order_id        UUID        REFERENCES order_details(order_id),
    fert_id         UUID        REFERENCES fert_master(fert_id),
    current_status  VARCHAR(30) NOT NULL DEFAULT 'GATE_ARRIVED'
        CHECK (current_status IN (
            'GATE_ARRIVED','INDUCTION_WIP','INDUCTION_HOLD',
            'YARD_BUFFER','STATION_WIP','QA_PENDING',
            'QA_HOLD_REWORK','QA_CLEARED','SHOWER_TEST',
            'FVI','READY_FOR_DISPATCH','DISPATCHED_INVOICED','CANCELLED'
        )),
    current_station_id UUID     REFERENCES station_master(station_id),
    -- OBD check
    diesel_litres   NUMERIC(8,2),
    battery_voltage NUMERIC(8,2),
    dongle_status   VARCHAR(15)
        CHECK (dongle_status IN ('PASS','FAIL','PENDING','NOT_CHECKED',NULL)),
    dongle_fault_codes JSONB,
    -- Gate documents (MoM 3.1)
    eway_bill_number    VARCHAR(50),
    eway_bill_verified  BOOLEAN  NOT NULL DEFAULT FALSE,
    delivery_challan_ref VARCHAR(100),
    challan_verified    BOOLEAN  NOT NULL DEFAULT FALSE,
    insurance_type      VARCHAR(20)
        CHECK (insurance_type IN
            ('DEALER_ARRANGED','THIRD_PARTY','COMPREHENSIVE',NULL)),
    insurance_cert_ref  VARCHAR(100),
    insurance_verified  BOOLEAN  NOT NULL DEFAULT FALSE,
    insurance_expiry    DATE,
    -- Production tracking fields
    da_lite_status  VARCHAR(10)
        CHECK (da_lite_status IN ('OK','PENDING','NA',NULL)),
    seat_supplier   VARCHAR(100),
    ac_communication_log TEXT,
    driver_request_notes TEXT,
    -- Timestamps
    gate_arrival_time   TIMESTAMPTZ,
    -- T=0: chassis first touches gate. Feeds gate-to-yard dwell KPI.
    induction_time      TIMESTAMPTZ,
    -- Set when status: GATE_ARRIVED → INDUCTION_WIP (lobby checklist done)
    yard_arrival_time   TIMESTAMPTZ,
    production_start_time TIMESTAMPTZ,
    body_age_start_time TIMESTAMPTZ,
    body_age_hours  NUMERIC(14,2) NOT NULL DEFAULT 0,
    dispatch_time   TIMESTAMPTZ,
    remarks         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chassis_ledger_status  ON chassis_ledger(current_status);
CREATE INDEX idx_chassis_ledger_station ON chassis_ledger(current_station_id);
CREATE INDEX idx_chassis_ledger_age     ON chassis_ledger(body_age_hours)
    WHERE current_status NOT IN ('DISPATCHED_INVOICED','CANCELLED');

CREATE TABLE yard_location_log (
    log_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    chassis_id      UUID        NOT NULL REFERENCES chassis_ledger(chassis_id),
    from_location   VARCHAR(20),
    to_location     VARCHAR(20) NOT NULL
        CHECK (to_location IN (
            'YARD_34_ACRE','UNIT_2','AUDI_YARD',
            'MAIN_PLANT','DISPATCHED'
        )),
    moved_by        UUID        NOT NULL REFERENCES login_users(user_id),
    notes           TEXT,
    moved_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_yard_location_log ON yard_location_log(chassis_id);

-- ============================================================
-- SECTION 4 — OBD DONGLE INTEGRATION
-- ============================================================

CREATE TABLE dongle_config (
    config_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key      VARCHAR(50) UNIQUE NOT NULL,
    field_path      VARCHAR(200) NOT NULL,
    expected_min    NUMERIC(10,3),
    expected_max    NUMERIC(10,3),
    is_fault_code_field BOOLEAN NOT NULL DEFAULT FALSE,
    description     TEXT,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE
);

INSERT INTO dongle_config (config_key, field_path, expected_min, expected_max, description)
VALUES
    ('diesel_litres',  'data.fuel.level_litres', 16.0, 17.0,
     'Diesel level 16-17L expected'),
    ('battery_voltage','data.battery.voltage_v', 11.5, 14.5,
     'Battery voltage 11.5-14.5V normal'),
    ('fault_codes',    'data.diagnostics.dtcs',  NULL, NULL,
     'DTC fault codes — empty = PASS')
ON CONFLICT (config_key) DO NOTHING;
UPDATE dongle_config SET is_fault_code_field = TRUE WHERE config_key = 'fault_codes';

CREATE TABLE dongle_check_log (
    check_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    chassis_id      UUID        NOT NULL REFERENCES chassis_ledger(chassis_id),
    raw_payload     JSONB       NOT NULL,
    diesel_litres   NUMERIC(8,2),
    battery_voltage NUMERIC(8,2),
    fault_codes     JSONB,
    check_result    VARCHAR(10) NOT NULL
        CHECK (check_result IN ('PASS','FAIL','ERROR')),
    fail_reasons    TEXT[],
    checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_dongle_check_chassis ON dongle_check_log(chassis_id);

-- ============================================================
-- SECTION 5 — MASTER BOM & PRODUCTION
-- ============================================================

-- master_bom: station-mapped BOM for automated backflush
CREATE TABLE master_bom (
    bom_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    fert_id         UUID        NOT NULL REFERENCES fert_master(fert_id),
    part_number     VARCHAR(100) NOT NULL REFERENCES rm_master(part_number),
    part_name       VARCHAR(255) NOT NULL,
    station_id      UUID        NOT NULL REFERENCES station_master(station_id),
    qty_per_bus     NUMERIC(14,3) NOT NULL CHECK (qty_per_bus > 0),
    uom             VARCHAR(20) NOT NULL DEFAULT 'NOS',
    issue_method    VARCHAR(15) NOT NULL DEFAULT 'BACKFLUSH'
        CHECK (issue_method IN ('BACKFLUSH','MANUAL')),
    sourcing_type   VARCHAR(20) NOT NULL DEFAULT 'BOP'
        CHECK (sourcing_type IN ('INHOUSE','BOP','VENDOR_SUPPLIED','SUBCONTRACT')),
    is_feature_dependent BOOLEAN NOT NULL DEFAULT FALSE,
    feature_id      UUID        REFERENCES dynamic_features(feature_id),
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    UNIQUE (fert_id, part_number, station_id)
);
CREATE INDEX idx_master_bom_fert    ON master_bom(fert_id);
CREATE INDEX idx_master_bom_station ON master_bom(station_id) WHERE is_active = TRUE;

-- defect_master: loaded by QA team before Phase 2b (D-04)
CREATE TABLE defect_master (
    defect_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    defect_code     VARCHAR(50) UNIQUE NOT NULL,
    defect_name     VARCHAR(255) NOT NULL,
    station_id      UUID        REFERENCES station_master(station_id),
    default_severity VARCHAR(10) NOT NULL
        CHECK (default_severity IN ('MINOR','MAJOR','CRITICAL','SAFETY')),
    default_points  INTEGER     NOT NULL DEFAULT 0,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE
);

-- production_logs: follows legacy naming (plural)
CREATE TABLE production_logs (
    log_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    chassis_id      UUID        NOT NULL REFERENCES chassis_ledger(chassis_id),
    station_id      UUID        NOT NULL REFERENCES station_master(station_id),
    shift_id        UUID        REFERENCES shift_master(shift_id),
    status          VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS'
        CHECK (status IN (
            'IN_PROGRESS','QA_PENDING','QA_CLEARED','REWORK','COMPLETE'
        )),
    station_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    station_out_time TIMESTAMPTZ,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        CASE WHEN station_out_time IS NOT NULL
             THEN EXTRACT(EPOCH FROM
                  (station_out_time - station_in_time))::INTEGER / 60
             ELSE NULL END) STORED,
    delay_minutes   INTEGER     NOT NULL DEFAULT 0,
    delay_reason    TEXT,
    operator_id     UUID        REFERENCES login_users(user_id),
    supervisor_id   UUID        REFERENCES login_users(user_id),
    qa_log_id       UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_production_logs_active
    ON production_logs(chassis_id, station_id) WHERE status = 'IN_PROGRESS';
CREATE INDEX idx_production_logs_chassis ON production_logs(chassis_id);

-- qa_logs: follows legacy naming (plural)
CREATE TABLE qa_logs (
    qa_log_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_no   VARCHAR(100) UNIQUE NOT NULL,
    chassis_id      UUID        NOT NULL REFERENCES chassis_ledger(chassis_id),
    production_log_id UUID      NOT NULL REFERENCES production_logs(log_id),
    station_id      UUID        NOT NULL REFERENCES station_master(station_id),
    inspection_type VARCHAR(30) NOT NULL,
    qa_status       VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (qa_status IN
            ('PENDING','PASS','FAIL','HOLD','REWORK_REQUIRED')),
    total_defect_points INTEGER NOT NULL DEFAULT 0,
    pass_threshold  INTEGER     NOT NULL DEFAULT 15,
    checklist_log_id UUID       REFERENCES checklist_log(log_id),
    inspector_id    UUID        REFERENCES login_users(user_id),
    shift_id        UUID        REFERENCES shift_master(shift_id),
    inspected_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_qa_logs_chassis ON qa_logs(chassis_id);
CREATE INDEX idx_qa_logs_pending ON qa_logs(qa_status)
    WHERE qa_status IN ('PENDING','HOLD','REWORK_REQUIRED');

-- Update production_logs FK to qa_logs
ALTER TABLE production_logs
    ADD CONSTRAINT fk_production_qa
    FOREIGN KEY (qa_log_id) REFERENCES qa_logs(qa_log_id);

-- qa_defect_log: per-defect records within a QA inspection
CREATE TABLE qa_defect_log (
    defect_log_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    qa_log_id       UUID        NOT NULL REFERENCES qa_logs(qa_log_id),
    defect_master_id UUID       REFERENCES defect_master(defect_id),
    defect_code     VARCHAR(50),
    defect_description TEXT     NOT NULL,
    defect_type     VARCHAR(25) NOT NULL DEFAULT 'QUALITY_DEFECT'
        CHECK (defect_type IN (
            'QUALITY_DEFECT','PARTS_SHORTAGE',
            'WORK_PENDING','SPECIFICATION_MISMATCH'
        )),
    severity        VARCHAR(10) NOT NULL
        CHECK (severity IN ('MINOR','MAJOR','CRITICAL','SAFETY')),
    defect_points   INTEGER     NOT NULL DEFAULT 0,
    rework_required BOOLEAN     NOT NULL DEFAULT FALSE,
    status          VARCHAR(25) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN (
            'OPEN','REWORK_ASSIGNED','REWORK_COMPLETED',
            'REINSPECTION_PENDING','CLOSED'
        )),
    photo_paths     TEXT[],
    assigned_to     UUID        REFERENCES login_users(user_id),
    resolved_by     UUID        REFERENCES login_users(user_id),
    resolved_at     TIMESTAMPTZ,
    repeat_defect_flag BOOLEAN  NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_qa_defect_qa   ON qa_defect_log(qa_log_id);
CREATE INDEX idx_qa_defect_open ON qa_defect_log(status) WHERE status != 'CLOSED';

-- ============================================================
-- SECTION 6 — BACKFLUSH
-- ============================================================

CREATE TABLE backflush_log (
    backflush_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    chassis_id      UUID        NOT NULL REFERENCES chassis_ledger(chassis_id),
    station_id      UUID        NOT NULL REFERENCES station_master(station_id),
    qa_log_id       UUID        NOT NULL REFERENCES qa_logs(qa_log_id),
    status          VARCHAR(15) NOT NULL
        CHECK (status IN ('SUCCESS','ROLLED_BACK')),
    triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (chassis_id, station_id)
);

CREATE TABLE backflush_details (
    detail_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    backflush_id    UUID        NOT NULL REFERENCES backflush_log(backflush_id),
    part_number     VARCHAR(100) NOT NULL,
    qty_deducted    NUMERIC(14,3) NOT NULL,
    batch_id        UUID        REFERENCES grn_detail(batch_id),
    rm_inventory_log_id UUID    REFERENCES rm_inventory_log(log_id)
);
CREATE INDEX idx_backflush_details ON backflush_details(backflush_id);

-- fn_backflush_on_qa_pass: atomic stored procedure
CREATE OR REPLACE FUNCTION fn_backflush_on_qa_pass(
    p_chassis_id  UUID,
    p_station_id  UUID,
    p_qa_log_id   UUID,
    p_operator_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_fert_id   UUID;
    v_order_id  UUID;
    v_cpq       JSONB;
    v_item      RECORD;
    v_inv       RECORD;
    v_new_stock NUMERIC;
    v_log_id    UUID;
    v_bf_id     UUID;
    v_result    JSONB := '[]'::JSONB;
BEGIN
    SELECT cl.order_id, o.fert_id, o.cpq_config
    INTO v_order_id, v_fert_id, v_cpq
    FROM chassis_ledger cl
    JOIN order_details o ON o.order_id = cl.order_id
    WHERE cl.chassis_id = p_chassis_id;

    IF v_fert_id IS NULL THEN
        RAISE EXCEPTION 'BACKFLUSH_ERROR: No FERT mapped for chassis %', p_chassis_id;
    END IF;

    FOR v_item IN
        SELECT mb.part_number, mb.qty_per_bus,
               mb.is_feature_dependent, df.cpq_key
        FROM master_bom mb
        LEFT JOIN dynamic_features df ON df.feature_id = mb.feature_id
        WHERE mb.fert_id    = v_fert_id
          AND mb.station_id = p_station_id
          AND mb.is_active  = TRUE
          AND mb.issue_method = 'BACKFLUSH'
          AND (
              NOT mb.is_feature_dependent OR
              (v_cpq ? df.cpq_key AND (v_cpq ->> df.cpq_key)::BOOLEAN = TRUE)
          )
        ORDER BY mb.part_number ASC
    LOOP
        SELECT * INTO v_inv
        FROM rm_inventory
        WHERE part_number  = v_item.part_number
          AND location_type = 'FLOOR'
        ORDER BY part_number ASC
        FOR UPDATE;

        IF NOT FOUND OR v_inv.current_stock_pcs < v_item.qty_per_bus THEN
            RAISE EXCEPTION
                'BACKFLUSH_SHORTAGE: % need %, floor has %',
                v_item.part_number,
                v_item.qty_per_bus,
                COALESCE(v_inv.current_stock_pcs, 0);
        END IF;

        v_new_stock := v_inv.current_stock_pcs - v_item.qty_per_bus;

        UPDATE rm_inventory
        SET current_stock_pcs = v_new_stock,
            last_updated      = NOW()
        WHERE inventory_id = v_inv.inventory_id;

        INSERT INTO rm_inventory_log
            (part_number, store_id, location_type, batch_id,
             balance_before, change_quantity_pcs, new_quantity_after_change,
             transaction_type, reference_type, reference_id, updated_by)
        VALUES
            (v_item.part_number, v_inv.store_id, 'FLOOR', v_inv.batch_id,
             v_inv.current_stock_pcs, -v_item.qty_per_bus, v_new_stock,
             'BACKFLUSH', 'QA_LOG', p_qa_log_id, p_operator_id)
        RETURNING log_id INTO v_log_id;

        v_result := v_result || jsonb_build_object(
            'part_number', v_item.part_number,
            'qty_deducted', v_item.qty_per_bus,
            'log_id', v_log_id
        );
    END LOOP;

    INSERT INTO backflush_log (chassis_id, station_id, qa_log_id, status)
    VALUES (p_chassis_id, p_station_id, p_qa_log_id, 'SUCCESS')
    ON CONFLICT (chassis_id, station_id) DO NOTHING
    RETURNING backflush_id INTO v_bf_id;

    IF v_bf_id IS NOT NULL THEN
        INSERT INTO backflush_details (backflush_id, part_number, qty_deducted, rm_inventory_log_id)
        SELECT v_bf_id,
               (e->>'part_number'),
               (e->>'qty_deducted')::NUMERIC,
               (e->>'log_id')::UUID
        FROM jsonb_array_elements(v_result) e;
    END IF;

    RETURN jsonb_build_object('status','SUCCESS',
           'lines', jsonb_array_length(v_result));

EXCEPTION WHEN OTHERS THEN
    BEGIN
        INSERT INTO backflush_log (chassis_id, station_id, qa_log_id, status)
        VALUES (p_chassis_id, p_station_id, p_qa_log_id, 'ROLLED_BACK')
        ON CONFLICT (chassis_id, station_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SECTION 7 — REWORK & POST-DISPATCH
-- ============================================================

CREATE TABLE rework_log (
    rework_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    defect_log_id   UUID        NOT NULL REFERENCES qa_defect_log(defect_log_id),
    chassis_id      UUID        NOT NULL REFERENCES chassis_ledger(chassis_id),
    station_id      UUID        NOT NULL REFERENCES station_master(station_id),
    assigned_to     UUID        REFERENCES login_users(user_id),
    rework_description TEXT     NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN','IN_PROGRESS','COMPLETE','REINSPECTION')),
    rework_start    TIMESTAMPTZ,
    rework_end      TIMESTAMPTZ,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        CASE WHEN rework_start IS NOT NULL AND rework_end IS NOT NULL
             THEN EXTRACT(EPOCH FROM (rework_end - rework_start))::INTEGER / 60
             ELSE NULL END) STORED,
    photo_before    TEXT,
    photo_after     TEXT,
    rework_cost     NUMERIC(12,2),
    repeat_count    INTEGER     NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rework_log_chassis ON rework_log(chassis_id);
CREATE INDEX idx_rework_log_open    ON rework_log(status) WHERE status != 'COMPLETE';

CREATE TABLE rework_parts_log (
    log_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    rework_id       UUID        NOT NULL REFERENCES rework_log(rework_id),
    part_number     VARCHAR(100) NOT NULL,
    qty_used        NUMERIC(14,3) NOT NULL,
    unit_cost       NUMERIC(14,4),
    total_cost      NUMERIC(12,2) GENERATED ALWAYS AS (qty_used * unit_cost) STORED,
    rm_inventory_log_id UUID    REFERENCES rm_inventory_log(log_id)
);

-- post_dispatch_service: buses returning for FAPS, rework, seat change etc.
CREATE TABLE post_dispatch_service (
    service_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    service_number  VARCHAR(80) UNIQUE NOT NULL,
    chassis_number  VARCHAR(150) NOT NULL,
    dispatch_id     UUID        REFERENCES dispatch_notes(dispatch_id),
    service_type    VARCHAR(25) NOT NULL
        CHECK (service_type IN (
            'FAPS_FITMENT','SEAT_CHANGE','REFURBISHMENT',
            'AC_FITMENT','ACCIDENTAL_REPAIR','GENERAL_REWORK'
        )),
    inward_date     DATE        NOT NULL,
    customer_name   VARCHAR(255),
    transporter     VARCHAR(100),
    description     TEXT,
    status          VARCHAR(15) NOT NULL DEFAULT 'INWARD'
        CHECK (status IN ('INWARD','IN_PROGRESS','COMPLETE','DISPATCHED')),
    outward_date    DATE,
    remarks         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_post_dispatch_chassis ON post_dispatch_service(chassis_number);

-- ============================================================
-- SECTION 8 — FINANCE: 3-WAY MATCH & SALES INVOICE
-- ============================================================

-- vendor_invoice: uploaded by Finance for 3-way match
CREATE TABLE vendor_invoice (
    invoice_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number  VARCHAR(100) UNIQUE NOT NULL,
    vendor_id       UUID        NOT NULL REFERENCES vendor_master(vendor_id),
    po_id           UUID        NOT NULL REFERENCES rm_purchase_order(po_id),
    grn_id          UUID        REFERENCES rm_receiving_log(grn_id),
    invoice_date    DATE        NOT NULL,
    invoice_amount  NUMERIC(14,2) NOT NULL,
    invoice_qty     NUMERIC(14,3),
    tax_amount      NUMERIC(12,2),
    total_with_tax  NUMERIC(14,2),
    file_path       TEXT,
    status          VARCHAR(25) NOT NULL DEFAULT 'RECEIVED'
        CHECK (status IN (
            'RECEIVED','MATCH_PENDING','TOUCHLESS_PASSED',
            'EXCEPTION_HOLD','APPROVED_FOR_PAYMENT','REJECTED'
        )),
    uploaded_by     UUID        NOT NULL REFERENCES login_users(user_id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vendor_invoice_vendor ON vendor_invoice(vendor_id);
CREATE INDEX idx_vendor_invoice_po     ON vendor_invoice(po_id);
CREATE INDEX idx_vendor_invoice_open   ON vendor_invoice(status)
    WHERE status NOT IN ('APPROVED_FOR_PAYMENT','REJECTED');

CREATE TABLE three_way_match_log (
    match_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID        NOT NULL REFERENCES vendor_invoice(invoice_id),
    po_id           UUID        NOT NULL REFERENCES rm_purchase_order(po_id),
    grn_id          UUID        REFERENCES rm_receiving_log(grn_id),
    po_qty          NUMERIC(14,3),
    grn_qty         NUMERIC(14,3),
    invoice_qty     NUMERIC(14,3),
    po_amount       NUMERIC(14,2),
    invoice_amount  NUMERIC(14,2),
    qty_variance    NUMERIC(14,3) GENERATED ALWAYS AS
        (COALESCE(invoice_qty,0) - COALESCE(grn_qty,0)) STORED,
    amount_variance NUMERIC(14,2) GENERATED ALWAYS AS
        (COALESCE(invoice_amount,0) - COALESCE(po_amount,0)) STORED,
    match_status    VARCHAR(25) NOT NULL DEFAULT 'MATCH_PENDING'
        CHECK (match_status IN (
            'MATCH_PENDING','TOUCHLESS_PASSED','EXCEPTION_HOLD',
            'APPROVED_FOR_PAYMENT','REJECTED'
        )),
    exception_code  VARCHAR(30),
    exception_note  TEXT,
    reviewed_by     UUID        REFERENCES login_users(user_id),
    reviewed_at     TIMESTAMPTZ,
    tally_exported  BOOLEAN     NOT NULL DEFAULT FALSE,
    tally_export_at TIMESTAMPTZ,
    tally_ref       VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_3way_invoice ON three_way_match_log(invoice_id);
CREATE INDEX idx_3way_tally   ON three_way_match_log(tally_exported)
    WHERE tally_exported = FALSE AND match_status = 'APPROVED_FOR_PAYMENT';

-- tally_export_config: Tally integration settings
CREATE TABLE tally_export_config (
    config_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key      VARCHAR(50) UNIQUE NOT NULL,
    config_value    VARCHAR(255) NOT NULL,
    description     TEXT,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE
);

INSERT INTO tally_export_config (config_key, config_value, description) VALUES
    ('tally_version',    'PRIME',
     'Tally Prime — confirm before Phase 2f'),
    ('company_name',     'BHAGIRATH BROTHERS AUDI AUTOMOBILES',
     'Tally company name'),
    ('ledger_purchases', 'Purchase Account', 'Purchase ledger in Tally'),
    ('ledger_sales',     'Sales Account',    'Sales ledger in Tally'),
    ('gst_cgst_ledger',  'Output CGST',      'CGST output ledger'),
    ('gst_sgst_ledger',  'Output SGST',      'SGST output ledger'),
    ('gst_igst_ledger',  'Output IGST',      'IGST output ledger')
ON CONFLICT (config_key) DO NOTHING;

-- sales_invoice: Tax Invoice at dispatch (sequential from invoice 1254)
CREATE TABLE sales_invoice (
    invoice_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number  VARCHAR(80) UNIQUE NOT NULL,
    invoice_seq     INTEGER     UNIQUE NOT NULL,
    -- Continues from 1254 per PATEL sheet
    dispatch_id     UUID        NOT NULL REFERENCES dispatch_notes(dispatch_id),
    chassis_number  VARCHAR(150) NOT NULL,
    dealer_id       UUID        REFERENCES dealer_master(dealer_id),
    customer_name   VARCHAR(255) NOT NULL,
    invoice_date    DATE        NOT NULL,
    taxable_amount  NUMERIC(14,2) NOT NULL,
    cgst_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    sgst_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    igst_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount    NUMERIC(14,2) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','ISSUED','PAID','PARTIALLY_PAID','CANCELLED')),
    payment_received NUMERIC(14,2) NOT NULL DEFAULT 0,
    payment_date    DATE,
    tally_ref       VARCHAR(100),
    tally_exported  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_by      UUID        REFERENCES login_users(user_id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sales_invoice_dealer ON sales_invoice(dealer_id);
CREATE INDEX idx_sales_invoice_tally  ON sales_invoice(tally_exported)
    WHERE tally_exported = FALSE AND status = 'ISSUED';

-- ============================================================
-- SECTION 9 — DEALER PORTAL
-- ============================================================

CREATE TABLE dealer_portal_log (
    log_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_id       UUID        NOT NULL REFERENCES dealer_master(dealer_id),
    session_token   VARCHAR(128) UNIQUE NOT NULL,
    otp_verified    BOOLEAN     NOT NULL DEFAULT FALSE,
    ip_address      INET,
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    invalidated_at  TIMESTAMPTZ
);
CREATE INDEX idx_dealer_portal_token ON dealer_portal_log(session_token)
    WHERE invalidated_at IS NULL;

CREATE TABLE dealer_portal_action_log (
    action_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_id       UUID        NOT NULL REFERENCES dealer_master(dealer_id),
    session_id      UUID        REFERENCES dealer_portal_log(log_id),
    action_type     VARCHAR(30) NOT NULL
        CHECK (action_type IN (
            'ORDER_PLACED','ORDER_UPDATED','PRODUCTION_VIEW',
            'DISPATCH_VIEWED','INVOICE_DOWNLOADED',
            'ADVANCE_SUBMITTED','WARRANTY_CLAIM_RAISED'
        )),
    entity_type     VARCHAR(30),
    entity_id       UUID,
    details         JSONB,
    performed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_dealer_action_dealer ON dealer_portal_action_log(dealer_id);
CREATE TRIGGER trg_dealer_action_immutable
    BEFORE UPDATE OR DELETE ON dealer_portal_action_log
    FOR EACH ROW EXECUTE FUNCTION fn_block_immutable();

-- ============================================================
-- SECTION 10 — REPORTING VIEWS
-- ============================================================

-- Live WIP dashboard
CREATE OR REPLACE VIEW v_live_wip AS
SELECT
    cl.chassis_id,
    cl.chassis_number,
    cl.current_status,
    sm.station_name,
    sm.sequence_no,
    sm.standard_cycle_time_min,
    cl.body_age_hours,
    ROUND(cl.body_age_hours / 24, 1) AS body_age_days,
    pl.station_in_time,
    pl.delay_minutes,
    COALESCE(ql.total_defect_points, 0) AS defect_points,
    ql.qa_status,
    o.order_number,
    f.fert_name,
    o.cpq_config,
    d.dealer_name
FROM chassis_ledger cl
LEFT JOIN station_master sm ON sm.station_id = cl.current_station_id
LEFT JOIN production_logs pl
    ON pl.chassis_id = cl.chassis_id AND pl.status = 'IN_PROGRESS'
LEFT JOIN qa_logs ql
    ON ql.production_log_id = pl.log_id
LEFT JOIN order_details o  ON o.order_id  = cl.order_id
LEFT JOIN fert_master f    ON f.fert_id   = cl.fert_id
LEFT JOIN dealer_master d  ON d.dealer_id = cl.dealer_id
WHERE cl.current_status NOT IN ('DISPATCHED_INVOICED','CANCELLED','GATE_ARRIVED');

-- FVI straight-pass rate (from FVI tracking Excel)
CREATE OR REPLACE VIEW v_fvi_straight_pass AS
SELECT
    DATE_TRUNC('day', ql.inspected_at) AS inspection_date,
    COUNT(*)                            AS total_inspected,
    COUNT(*) FILTER (
        WHERE ql.qa_status = 'PASS'
        AND NOT EXISTS (
            SELECT 1 FROM qa_defect_log qd
            WHERE qd.qa_log_id = ql.qa_log_id
        )
    )                                   AS straight_pass_count,
    COUNT(*) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM qa_defect_log qd
            WHERE qd.qa_log_id = ql.qa_log_id
            AND qd.defect_type = 'PARTS_SHORTAGE'
        )
    )                                   AS shortage_held_count
FROM qa_logs ql
JOIN station_master sm ON sm.station_id = ql.station_id
WHERE sm.station_code = 'STN-16'
GROUP BY DATE_TRUNC('day', ql.inspected_at)
ORDER BY inspection_date DESC;

-- ============================================================
-- SECTION 11 — SEQUENCES & MIGRATIONS
-- ============================================================

CREATE SEQUENCE seq_order_number       START 1 INCREMENT 1;
CREATE SEQUENCE seq_qa_log_number      START 1 INCREMENT 1;
CREATE SEQUENCE seq_dispatch_number    START 1 INCREMENT 1;
CREATE SEQUENCE seq_sales_invoice_seq  START 1254 INCREMENT 1;
CREATE SEQUENCE seq_post_dispatch_no   START 1 INCREMENT 1;

INSERT INTO schema_migrations VALUES
    ('1.0.0-audi', 'audi.sql — Audi Automobiles plugin tables', NOW())
ON CONFLICT (version) DO NOTHING;

-- ============================================================
-- END audi.sql
-- ============================================================
