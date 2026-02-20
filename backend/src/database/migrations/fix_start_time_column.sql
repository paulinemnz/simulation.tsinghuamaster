-- Migration: Fix start_time column mismatch
-- Standardize on started_at for participants table
-- This migration ensures the database schema matches code expectations

-- Step 1: If start_time exists but started_at doesn't, copy data and rename
DO $$
BEGIN
  -- Check if start_time column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participants' AND column_name = 'start_time'
  ) THEN
    -- If started_at doesn't exist, create it and copy data from start_time
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'participants' AND column_name = 'started_at'
    ) THEN
      ALTER TABLE participants ADD COLUMN started_at TIMESTAMP;
      UPDATE participants SET started_at = start_time WHERE start_time IS NOT NULL;
    ELSE
      -- Both exist, copy from start_time to started_at where started_at is NULL
      UPDATE participants SET started_at = start_time WHERE started_at IS NULL AND start_time IS NOT NULL;
    END IF;
    
    -- Drop start_time column (we standardize on started_at)
    ALTER TABLE participants DROP COLUMN IF EXISTS start_time;
  END IF;
  
  -- Ensure started_at column exists (create if it doesn't)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'participants' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE participants ADD COLUMN started_at TIMESTAMP;
  END IF;
END $$;

-- Step 2: Ensure simulation_sessions has all required columns
DO $$
BEGIN
  -- Ensure started_at exists in simulation_sessions (should already exist, but be safe)
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
  -- Ensure participant_id exists (may have been added in a previous migration)
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

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_participants_started_at ON participants(started_at);
CREATE INDEX IF NOT EXISTS idx_simulation_sessions_started_at ON simulation_sessions(started_at);
