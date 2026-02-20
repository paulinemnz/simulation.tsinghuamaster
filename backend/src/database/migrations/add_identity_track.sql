-- Migration: Add identity_track column to simulation_sessions
-- This column stores the strategic identity track derived from Act III decision
-- Values: 'Efficiency at Scale', 'Managed Adaptation', 'Relational Foundation'

-- Add identity_track column to simulation_sessions if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'simulation_sessions' 
        AND column_name = 'identity_track'
    ) THEN
        ALTER TABLE simulation_sessions ADD COLUMN identity_track VARCHAR(100);
    END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_simulation_sessions_identity_track ON simulation_sessions(identity_track);
