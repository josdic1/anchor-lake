-- =============================================================================
-- 001_initial.sql
-- Schema only. No client data. Run this for every new tenant.
-- =============================================================================

BEGIN;

-- =============================================================================
-- CLEAN RESET
-- =============================================================================

DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS booking_attendees CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS meal_windows CASCADE;
DROP TABLE IF EXISTS room_blocks CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenant_config CASCADE;

DROP TYPE IF EXISTS audit_action CASCADE;
DROP TYPE IF EXISTS menu_category CASCADE;
DROP TYPE IF EXISTS dietary_flag CASCADE;
DROP TYPE IF EXISTS kitchen_status CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS meal_type CASCADE;
DROP TYPE IF EXISTS member_relation CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('member', 'staff', 'admin');
CREATE TYPE member_relation AS ENUM ('PRIMARY', 'SPOUSE', 'CHILD', 'OTHER');
CREATE TYPE meal_type AS ENUM ('LUNCH', 'DINNER', 'AFTERHOURS', 'SPECIAL_EVENT');
CREATE TYPE booking_status AS ENUM ('DRAFT', 'CONFIRMED', 'SEATED', 'SERVICE', 'COMPLETED', 'CANCELLED');
CREATE TYPE kitchen_status AS ENUM ('INCOMING', 'IN_KITCHEN', 'READY', 'SERVED');
CREATE TYPE dietary_flag AS ENUM (
    'DAIRY_FREE', 'EGG_FREE', 'FISH_ALLERGY', 'GLUTEN_FREE', 'HALAL', 'KOSHER',
    'NUT_ALLERGY', 'PEANUT_ALLERGY', 'SESAME_ALLERGY', 'SHELLFISH_ALLERGY',
    'SOY_FREE', 'VEGAN', 'VEGETARIAN'
);
CREATE TYPE menu_category AS ENUM ('STARTER', 'MAIN', 'SIDE', 'DESSERT', 'DRINK', 'SPECIAL');
CREATE TYPE audit_action AS ENUM (
    'BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_SEATED',
    'BOOKING_SERVICE_STARTED', 'BOOKING_COMPLETED', 'BOOKING_CANCELLED',
    'BOOKING_FORCE_COMPLETED', 'BOOKING_REVERTED_TO_DRAFT', 'BOOKING_UPDATED',
    'ATTENDEE_ADDED', 'ATTENDEE_REMOVED',
    'ORDER_CREATED', 'ORDER_FIRED', 'ORDER_KITCHEN_STATUS_CHANGE', 'ORDER_PRINT_TRIGGERED',
    'ROOM_BLOCKED', 'ROOM_UNBLOCKED',
    'MENU_ITEM_CREATED', 'MENU_ITEM_UPDATED', 'MENU_ITEM_DEACTIVATED'
);

-- =============================================================================
-- TENANT CONFIG
-- =============================================================================

CREATE TABLE tenant_config (
    id            SERIAL PRIMARY KEY,
    name          TEXT,
    primary_color TEXT,
    logo_url      TEXT,
    features      JSONB,
    tagline       TEXT,
    font_display  TEXT,
    font_body     TEXT,
    font_url      TEXT
);

-- =============================================================================
-- USERS
-- =============================================================================

CREATE TABLE users (
    id                    SERIAL PRIMARY KEY,
    first_name            VARCHAR(100) NOT NULL,
    last_name             VARCHAR(100) NOT NULL,
    email                 VARCHAR(255) NOT NULL UNIQUE,
    hashed_password       TEXT NOT NULL,
    role                  user_role NOT NULL DEFAULT 'member',
    member_number         VARCHAR(50) UNIQUE,
    force_password_change BOOLEAN NOT NULL DEFAULT FALSE,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    notes                 TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- MEMBERS
-- =============================================================================

CREATE TABLE members (
    id            SERIAL PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    relation      member_relation NOT NULL DEFAULT 'PRIMARY',
    dietary_flags dietary_flag[] DEFAULT '{}',
    notes         TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_members_user ON members (user_id);

-- =============================================================================
-- ROOMS
-- =============================================================================

CREATE TABLE rooms (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    capacity        INT NOT NULL,
    one_booking_max BOOLEAN NOT NULL DEFAULT FALSE,
    dines_only      BOOLEAN NOT NULL DEFAULT TRUE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE room_blocks (
    id           SERIAL PRIMARY KEY,
    room_id      INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    blocked_date DATE NOT NULL,
    reason       TEXT,
    created_by   INT REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (room_id, blocked_date)
);

-- =============================================================================
-- MEAL WINDOWS
-- =============================================================================

CREATE TABLE meal_windows (
    id              SERIAL PRIMARY KEY,
    meal_type       meal_type NOT NULL UNIQUE,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    last_order_time TIME NOT NULL,
    available_days  INT[] NOT NULL
);

-- =============================================================================
-- BOOKINGS
-- =============================================================================

CREATE TABLE bookings (
    id                      SERIAL PRIMARY KEY,
    booking_member_id       INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    room_id                 INT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    booking_date            DATE NOT NULL,
    meal_type               meal_type NOT NULL,
    estimated_arrival       TIME NOT NULL,
    status                  booking_status NOT NULL DEFAULT 'DRAFT',
    party_size              INT NOT NULL DEFAULT 0,
    is_special_event        BOOLEAN NOT NULL DEFAULT FALSE,
    notify_email_sent       BOOLEAN NOT NULL DEFAULT FALSE,
    notes                   TEXT,
    additional_charges      NUMERIC(10,2) DEFAULT 0.00,
    additional_charge_notes TEXT,
    confirmed_at            TIMESTAMPTZ,
    seated_at               TIMESTAMPTZ,
    service_at              TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    cancelled_at            TIMESTAMPTZ,
    force_completed         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- BOOKING ATTENDEES
-- =============================================================================

CREATE TABLE booking_attendees (
    id               SERIAL PRIMARY KEY,
    booking_id       INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    linked_member_id INT REFERENCES members(id) ON DELETE SET NULL,
    guest_first_name VARCHAR(100),
    guest_last_name  VARCHAR(100),
    is_member_guest  BOOLEAN NOT NULL DEFAULT FALSE,
    dietary_flags    dietary_flag[] DEFAULT '{}',
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT attendee_identity_check CHECK (
        linked_member_id IS NOT NULL
        OR (guest_first_name IS NOT NULL AND guest_last_name IS NOT NULL)
    )
);

-- =============================================================================
-- MENU
-- =============================================================================

CREATE TABLE menu_items (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(200) NOT NULL,
    description    TEXT,
    category       menu_category NOT NULL,
    price          NUMERIC(10,2) NOT NULL,
    is_starter     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    is_special     BOOLEAN NOT NULL DEFAULT FALSE,
    is_modifier    BOOLEAN NOT NULL DEFAULT FALSE,
    parent_item_id INT REFERENCES menu_items(id) ON DELETE SET NULL,
    dietary_flags  dietary_flag[] DEFAULT '{}',
    sort_order     INT DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_items_parent ON menu_items (parent_item_id);
CREATE INDEX idx_menu_items_category ON menu_items (category);
CREATE INDEX idx_menu_items_active ON menu_items (is_active);

-- =============================================================================
-- ORDERS
-- =============================================================================

CREATE TABLE orders (
    id              SERIAL PRIMARY KEY,
    booking_id      INT NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    created_by      INT REFERENCES users(id) ON DELETE SET NULL,
    kitchen_status  kitchen_status NOT NULL DEFAULT 'INCOMING',
    fired_at        TIMESTAMPTZ,
    print_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id                   SERIAL PRIMARY KEY,
    order_id             INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id         INT NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
    quantity             INT NOT NULL DEFAULT 1,
    unit_price           NUMERIC(10,2) NOT NULL,
    special_instructions TEXT,
    modifier_ids         INT[] DEFAULT '{}',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT quantity_positive CHECK (quantity > 0)
);

-- =============================================================================
-- AUDIT LOG
-- =============================================================================

CREATE TABLE audit_log (
    id           SERIAL PRIMARY KEY,
    entity_type  VARCHAR(50) NOT NULL,
    entity_id    INT NOT NULL,
    action       audit_action NOT NULL,
    old_value    JSONB,
    new_value    JSONB,
    performed_by INT REFERENCES users(id) ON DELETE SET NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes        TEXT
);

CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_log_performed_at ON audit_log (performed_at);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_bookings_date ON bookings (booking_date);
CREATE INDEX idx_bookings_room_date ON bookings (room_id, booking_date);
CREATE INDEX idx_bookings_member ON bookings (booking_member_id);
CREATE INDEX idx_bookings_status ON bookings (status);

CREATE INDEX idx_attendees_linked_member ON booking_attendees (linked_member_id);
CREATE INDEX idx_attendees_booking ON booking_attendees (booking_id);

CREATE INDEX idx_orders_booking ON orders (booking_id);
CREATE INDEX idx_orders_kitchen_status ON orders (kitchen_status);
CREATE INDEX idx_orders_fired_at ON orders (fired_at);

CREATE INDEX idx_room_blocks_date ON room_blocks (blocked_date);
CREATE INDEX idx_room_blocks_room_date ON room_blocks (room_id, blocked_date);

COMMIT;