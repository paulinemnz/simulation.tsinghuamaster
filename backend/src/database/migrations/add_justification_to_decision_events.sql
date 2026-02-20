-- Migration: Add justification column to decision_events table
-- This allows participants to provide reasoning for their decisions

-- Add justification column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'decision_events' 
        AND column_name = 'justification'
    ) THEN
        ALTER TABLE decision_events ADD COLUMN justification TEXT;
    END IF;
END $$;
