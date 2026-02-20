-- Migration: Add participant_id column to decision_events table if it doesn't exist
-- This fixes the "column participant_id does not exist" error

DO $$ 
BEGIN
    -- Check if participant_id column exists, if not, add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'decision_events' 
        AND column_name = 'participant_id'
    ) THEN
        ALTER TABLE decision_events 
        ADD COLUMN participant_id UUID REFERENCES participants(id) ON DELETE CASCADE;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_decision_events_participant 
        ON decision_events(participant_id);
        
        RAISE NOTICE 'Added participant_id column to decision_events table';
    ELSE
        RAISE NOTICE 'participant_id column already exists in decision_events table';
    END IF;
END $$;
