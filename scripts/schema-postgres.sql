-- =====================================================================
-- The Sabian Story — PostgreSQL Production Schema (Task 8)
--
-- This schema represents the target PostgreSQL table structure for
-- production deployments, transitioning from local SQLite.
-- =====================================================================

-- Readings table
CREATE TABLE IF NOT EXISTS readings (
    -- Non-guessable random base64url identifier (12-16 bytes of entropy)
    id VARCHAR(64) PRIMARY KEY,
    
    -- Timestamps (timestamptz for unambiguous UTC tracking)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Visitor profile & birth metadata
    display_name VARCHAR(120) NOT NULL,
    birth_date DATE NOT NULL,
    birth_time VARCHAR(10) NULL,             -- HH:mm or NULL when unknown
    time_known BOOLEAN NOT NULL DEFAULT TRUE,
    time_notation VARCHAR(255) NULL,         -- Disclosed reference instant description
    
    -- Resolved location
    place_id VARCHAR(100) NOT NULL,
    place_json JSONB NOT NULL,               -- Canonical place name, region, country, lat/lon, timezone
    
    -- Astrological & Symbolic data
    chart_json JSONB NOT NULL,               -- Exact calculated placements, houses, ephemeris config
    interpretation_json JSONB NULL,          -- Zod-validated 7-chapter story, gate interpretations, reflection ritual
    artwork_json JSONB NULL,                 -- Generated/placeholder artwork URLs, prompts, provenance
    providers_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- Exact provider models & versions used
    
    -- Lifecycle & Privacy flags
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending | generating | ready | failed
    error TEXT NULL,
    is_demo BOOLEAN NOT NULL DEFAULT TRUE,
    saved BOOLEAN NOT NULL DEFAULT FALSE,    -- Explicit opt-in save flag
    expires_at TIMESTAMPTZ NULL              -- Calculated expiration timestamp for automated cleanup
);

-- Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_readings_created_at ON readings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_status ON readings (status);
CREATE INDEX IF NOT EXISTS idx_readings_saved ON readings (saved);
CREATE INDEX IF NOT EXISTS idx_readings_expires_at ON readings (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_readings_stale_cleanup ON readings (status, created_at) WHERE status IN ('failed', 'generating', 'pending');

-- JSONB GIN Indexes for potential future queries
CREATE INDEX IF NOT EXISTS idx_readings_place_json_gin ON readings USING gin (place_json);
CREATE INDEX IF NOT EXISTS idx_readings_providers_json_gin ON readings USING gin (providers_json);

-- Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_readings_updated_at ON readings;
CREATE TRIGGER trg_readings_updated_at
    BEFORE UPDATE ON readings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- Automated Expiration / Retention Cleanup Stored Procedure
-- =====================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_readings(retention_days INT DEFAULT 90)
RETURNS INT AS $$
DECLARE
    deleted_count INT;
    retention_cutoff TIMESTAMPTZ := NOW() - (retention_days || ' days')::INTERVAL;
    stale_cutoff TIMESTAMPTZ := NOW() - INTERVAL '24 hours';
BEGIN
    -- 1. Delete stale uncompleted records older than 24h (failed, generating, pending)
    -- 2. Delete readings older than the disclosed retention period
    -- 3. Delete explicitly expired readings past expires_at
    WITH to_delete AS (
        DELETE FROM readings
        WHERE (status IN ('failed', 'generating', 'pending') AND created_at < stale_cutoff)
           OR (created_at < retention_cutoff)
           OR (expires_at IS NOT NULL AND expires_at < NOW())
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM to_delete;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
