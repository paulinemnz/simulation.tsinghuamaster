-- Migration: Add mode column to simulation_sessions table
-- This column stores the participation mode (C0, C1, C2) for research purposes

ALTER TABLE simulation_sessions 
ADD COLUMN IF NOT EXISTS mode VARCHAR(10) CHECK (mode IN ('C0', 'C1', 'C2'));

-- Add index for mode queries
CREATE INDEX IF NOT EXISTS idx_simulation_sessions_mode ON simulation_sessions(mode);
