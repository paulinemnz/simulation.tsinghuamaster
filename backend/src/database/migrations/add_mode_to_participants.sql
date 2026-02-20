-- Migration: Add mode column to participants table
-- This column stores the participation mode (C0, C1, C2) for research purposes

ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS mode VARCHAR(10) CHECK (mode IN ('C0', 'C1', 'C2'));

-- Add index for mode queries
CREATE INDEX IF NOT EXISTS idx_participants_mode ON participants(mode);
