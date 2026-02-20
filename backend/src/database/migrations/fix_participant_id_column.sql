-- Quick fix: Add participant_id column to decision_events if missing
-- This is a standalone migration that can be run directly

-- Add participant_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'decision_events' 
        AND column_name = 'participant_id'
    ) THEN
        ALTER TABLE decision_events 
        ADD COLUMN participant_id UUID;
        
        -- Add foreign key constraint if participants table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'participants') THEN
            ALTER TABLE decision_events 
            ADD CONSTRAINT fk_decision_events_participant 
            FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE;
        END IF;
        
        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_decision_events_participant ON decision_events(participant_id);
        
        RAISE NOTICE 'Successfully added participant_id column to decision_events';
    ELSE
        RAISE NOTICE 'participant_id column already exists - no action needed';
    END IF;
END $$;
