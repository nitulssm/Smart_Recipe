-- Smart Recipe Generator – PostgreSQL Schema
-- Run this file once against your database to create all required tables.
-- psql -d your_database -f schema.sql

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          BIGSERIAL                PRIMARY KEY,
    name        VARCHAR(255)             NOT NULL,
    email       VARCHAR(255)             NOT NULL UNIQUE,
    password    VARCHAR(255)             NOT NULL,   -- bcrypt hash
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Pending registrations (email not yet verified) ────────────────────────────
CREATE TABLE IF NOT EXISTS pending_users (
    id              BIGINT                   NOT NULL,
    name            VARCHAR(255)             NOT NULL,
    email           VARCHAR(255)             NOT NULL UNIQUE,
    password_hash   VARCHAR(255)             NOT NULL,
    code            CHAR(6)                  NOT NULL,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Password reset codes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reset_codes (
    email       VARCHAR(255)             NOT NULL PRIMARY KEY,
    code        CHAR(6)                  NOT NULL,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Saved recipes (user bookmarks) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_recipes (
    id          BIGSERIAL                PRIMARY KEY,
    user_id     BIGINT                   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(500)             NOT NULL,
    time        VARCHAR(100),
    difficulty  VARCHAR(50),
    servings    VARCHAR(50),
    description TEXT,
    ingredients JSONB                    NOT NULL DEFAULT '[]',
    steps       JSONB                    NOT NULL DEFAULT '[]',
    tips        JSONB                    NOT NULL DEFAULT '[]',
    image_url   TEXT,
    saved_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, title)
);

-- ── Viewed recipes (recently opened) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS viewed_recipes (
    id          BIGSERIAL                PRIMARY KEY,
    user_id     BIGINT                   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(500)             NOT NULL,
    time        VARCHAR(100),
    difficulty  VARCHAR(50),
    servings    VARCHAR(50),
    description TEXT,
    ingredients JSONB                    NOT NULL DEFAULT '[]',
    steps       JSONB                    NOT NULL DEFAULT '[]',
    tips        JSONB                    NOT NULL DEFAULT '[]',
    image_url   TEXT,
    viewed_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, title)
);

-- ── Indexes for common lookups ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_id    ON saved_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_viewed_recipes_user_id   ON viewed_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_users_expires_at ON pending_users(expires_at);
CREATE INDEX IF NOT EXISTS idx_reset_codes_expires_at   ON reset_codes(expires_at);
