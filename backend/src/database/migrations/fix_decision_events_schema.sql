-- Migration: Fix decision_events table schema
-- Adds missing columns: decision_time_ms, confidence, created_at
-- This fixes the "column decision_time_ms does not exist" error

DO $$ 
BEGIN
    -- Add decision_time_ms column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'decision_events' 
        AND column_name = 'decision_time_ms'
    ) THEN
        ALTER TABLE decision_events 
        ADD COLUMN decision_time_ms INTEGER;
        
        RAISE NOTICE 'Added decision_time_ms column to decision_events table';
    ELSE
        RAISE NOTICE 'decision_time_ms column already exists in decision_events table';
    END IF;

    -- Add confidence column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'decision_events' 
        AND column_name = 'confidence'
    ) THEN
        ALTER TABLE decision_events 
        ADD COLUMN confidence INTEGER;
        
        RAISE NOTICE 'Added confidence column to decision_events table';
    ELSE
        RAISE NOTICE 'confidence column already exists in decision_events table';
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'decision_events' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE decision_events 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        
        RAISE NOTICE 'Added created_at column to decision_events table';
    ELSE
        RAISE NOTICE 'created_at column already exists in decision_events table';
    END IF;
END $$;

-- Verify all required columns exist
DO $$
DECLARE
    missing_columns TEXT[];
    required_columns TEXT[] := ARRAY['id', 'simulation_session_id', 'participant_id', 'act_number', 'option_id', 'submitted_at', 'decision_time_ms', 'confidence', 'created_at'];
    col TEXT;
BEGIN
    missing_columns := ARRAY[]::TEXT[];
    
    FOREACH col IN ARRAY required_columns
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'decision_events' 
            AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING 'Missing required columns in decision_events: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'All required columns exist in decision_events table';
    END IF;
END $$;
