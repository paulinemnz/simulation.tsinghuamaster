-- Migration: Add Act-based tables for Terraform Industries simulation
-- This migration adds tables for tracking Act progress, decisions, and document interactions

-- Act Progress table (tracks progress through each act)
CREATE TABLE IF NOT EXISTS act_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_session_id UUID REFERENCES simulation_sessions(id) ON DELETE CASCADE,
    act_number INTEGER NOT NULL CHECK (act_number >= 1 AND act_number <= 4),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(simulation_session_id, act_number)
);

-- Decision Events table (tracks act-level decisions)
CREATE TABLE IF NOT EXISTS decision_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_session_id UUID REFERENCES simulation_sessions(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    act_number INTEGER NOT NULL CHECK (act_number >= 1 AND act_number <= 4),
    option_id VARCHAR(50) NOT NULL, -- e.g., 'A', 'B', 'C'
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    decision_time_ms INTEGER,
    confidence INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Events table (tracks document open/close interactions)
CREATE TABLE IF NOT EXISTS document_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_session_id UUID REFERENCES simulation_sessions(id) ON DELETE CASCADE,
    act_number INTEGER NOT NULL CHECK (act_number >= 1 AND act_number <= 4),
    document_id VARCHAR(100) NOT NULL,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    duration_ms INTEGER, -- calculated duration in milliseconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add current_act column to simulation_sessions if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'simulation_sessions' 
        AND column_name = 'current_act'
    ) THEN
        ALTER TABLE simulation_sessions ADD COLUMN current_act INTEGER DEFAULT 1 CHECK (current_act >= 1 AND current_act <= 4);
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_act_progress_session ON act_progress(simulation_session_id);
CREATE INDEX IF NOT EXISTS idx_act_progress_act ON act_progress(act_number);
CREATE INDEX IF NOT EXISTS idx_decision_events_session ON decision_events(simulation_session_id);
CREATE INDEX IF NOT EXISTS idx_decision_events_act ON decision_events(act_number);
CREATE INDEX IF NOT EXISTS idx_document_events_session ON document_events(simulation_session_id);
CREATE INDEX IF NOT EXISTS idx_document_events_act ON document_events(act_number);
CREATE INDEX IF NOT EXISTS idx_simulation_sessions_current_act ON simulation_sessions(current_act);
