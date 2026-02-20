-- Migration: Stabilize schema - remove start_time/end_time, standardize on started_at/completed_at
-- This migration ensures consistency across the codebase
-- Run this migration to fix schema drift issues

-- Step 1: Fix participants table - remove start_time/end_time, ensure started_at/completed_at exist
DO $$
BEGIN
  -- If start_time exists, copy data to started_at before dropping
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participants' AND column_name = 'start_time'
  ) THEN
    -- Ensure started_at exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'participants' AND column_name = 'started_at'
    ) THEN
      ALTER TABLE participants ADD COLUMN started_at TIMESTAMP;
    END IF;
    
    -- Copy data from start_time to started_at where started_at is NULL
    UPDATE participants 
    SET started_at = start_time 
    WHERE started_at IS NULL AND start_time IS NOT NULL;
    
    -- Drop start_time column
    ALTER TABLE participants DROP COLUMN IF EXISTS start_time;
  END IF;
  
  -- If end_time exists, copy data to completed_at before dropping
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participants' AND column_name = 'end_time'
  ) THEN
    -- Ensure completed_at exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'participants' AND column_name = 'completed_at'
    ) THEN
      ALTER TABLE participants ADD COLUMN completed_at TIMESTAMP;
    END IF;
    
    -- Copy data from end_time to completed_at where completed_at is NULL
    UPDATE participants 
    SET completed_at = end_time 
    WHERE completed_at IS NULL AND end_time IS NOT NULL;
    
    -- Drop end_time column
    ALTER TABLE participants DROP COLUMN IF EXISTS end_time;
  END IF;
  
  -- Ensure started_at exists (create if it doesn't)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participants' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE participants ADD COLUMN started_at TIMESTAMP;
  END IF;
  
  -- Ensure completed_at exists (create if it doesn't)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participants' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE participants ADD COLUMN completed_at TIMESTAMP;
  END IF;
END $$;

-- Step 2: Ensure simulation_sessions has all required columns
DO $$
BEGIN
  -- Ensure started_at exists in simulation_sessions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'simulation_sessions' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE simulation_sessions ADD COLUMN started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  -- Ensure current_act exists with default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'simulation_sessions' AND column_name = 'current_act'
  ) THEN
    ALTER TABLE simulation_sessions ADD COLUMN current_act INTEGER DEFAULT 1 CHECK (current_act >= 1 AND current_act <= 4);
  END IF;
  
  -- Ensure mode exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'simulation_sessions' AND column_name = 'mode'
  ) THEN
    ALTER TABLE simulation_sessions ADD COLUMN mode VARCHAR(10) CHECK (mode IN ('C0', 'C1', 'C2'));
  END IF;
END $$;

-- Step 3: Ensure decision_events table has all required columns
DO $$
BEGIN
  -- Ensure participant_id exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decision_events' AND column_name = 'participant_id'
  ) THEN
    ALTER TABLE decision_events ADD COLUMN participant_id UUID REFERENCES participants(id) ON DELETE CASCADE;
  END IF;
  
  -- Ensure decision_time_ms exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decision_events' AND column_name = 'decision_time_ms'
  ) THEN
    ALTER TABLE decision_events ADD COLUMN decision_time_ms INTEGER;
  END IF;
  
  -- Ensure confidence exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decision_events' AND column_name = 'confidence'
  ) THEN
    ALTER TABLE decision_events ADD COLUMN confidence INTEGER;
  END IF;
  
  -- Ensure created_at exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decision_events' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE decision_events ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Step 4: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_started_at ON participants(started_at);
CREATE INDEX IF NOT EXISTS idx_participants_completed_at ON participants(completed_at);
CREATE INDEX IF NOT EXISTS idx_simulation_sessions_started_at ON simulation_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_simulation_sessions_mode ON simulation_sessions(mode);
CREATE INDEX IF NOT EXISTS idx_simulation_sessions_current_act ON simulation_sessions(current_act);

-- Step 5: Verify schema consistency
DO $$
DECLARE
  has_start_time BOOLEAN;
  has_end_time BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participants' AND column_name = 'start_time'
  ) INTO has_start_time;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participants' AND column_name = 'end_time'
  ) INTO has_end_time;
  
  IF has_start_time OR has_end_time THEN
    RAISE WARNING 'Schema migration incomplete: start_time or end_time still exists in participants table';
  ELSE
    RAISE NOTICE 'Schema migration successful: participants table uses started_at/completed_at';
  END IF;
END $$;
