-- Migration: Research-grade logging tables and fields

-- Extend participants table with research metadata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'mode'
  ) THEN
    ALTER TABLE participants ADD COLUMN mode VARCHAR(10) CHECK (mode IN ('C0', 'C1', 'C2'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'status'
  ) THEN
    ALTER TABLE participants ADD COLUMN status VARCHAR(20) DEFAULT 'started' CHECK (status IN ('started', 'completed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE participants ADD COLUMN start_time TIMESTAMP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE participants ADD COLUMN end_time TIMESTAMP;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'covariates'
  ) THEN
    ALTER TABLE participants ADD COLUMN covariates JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'language'
  ) THEN
    ALTER TABLE participants ADD COLUMN language VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'device'
  ) THEN
    ALTER TABLE participants ADD COLUMN device VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE participants ADD COLUMN timezone VARCHAR(100);
  END IF;
END $$;

-- Extend decision_events to include participant-level fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'decision_events' AND column_name = 'participant_id'
  ) THEN
    ALTER TABLE decision_events ADD COLUMN participant_id UUID REFERENCES participants(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'decision_events' AND column_name = 'decision_time_ms'
  ) THEN
    ALTER TABLE decision_events ADD COLUMN decision_time_ms INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'decision_events' AND column_name = 'confidence'
  ) THEN
    ALTER TABLE decision_events ADD COLUMN confidence INTEGER;
  END IF;
END $$;

-- Memos
CREATE TABLE IF NOT EXISTS memos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  act_number INTEGER NOT NULL CHECK (act_number >= 1 AND act_number <= 4),
  text TEXT NOT NULL,
  word_count INTEGER,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat logs (C1/C2)
CREATE TABLE IF NOT EXISTS chat_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  act_number INTEGER NOT NULL CHECK (act_number >= 1 AND act_number <= 4),
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  meta JSONB
);

-- Event logs (single source of truth for events)
CREATE TABLE IF NOT EXISTS event_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  act_number INTEGER CHECK (act_number >= 1 AND act_number <= 4),
  event_type VARCHAR(100) NOT NULL,
  event_value TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_ms INTEGER,
  meta JSONB
);

-- Ratings (rubric)
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  act_number INTEGER NOT NULL CHECK (act_number >= 1 AND act_number <= 4),
  rater_id UUID REFERENCES users(id) ON DELETE SET NULL,
  vertical_coherence INTEGER CHECK (vertical_coherence BETWEEN 1 AND 7),
  vertical_evidence INTEGER CHECK (vertical_evidence BETWEEN 1 AND 7),
  vertical_tradeoffs INTEGER CHECK (vertical_tradeoffs BETWEEN 1 AND 7),
  vertical_accuracy INTEGER CHECK (vertical_accuracy BETWEEN 1 AND 7),
  vertical_impl INTEGER CHECK (vertical_impl BETWEEN 1 AND 7),
  horizontal_novelty INTEGER CHECK (horizontal_novelty BETWEEN 1 AND 7),
  horizontal_diff INTEGER CHECK (horizontal_diff BETWEEN 1 AND 7),
  horizontal_synthesis INTEGER CHECK (horizontal_synthesis BETWEEN 1 AND 7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Computed scores
CREATE TABLE IF NOT EXISTS computed_scores (
  participant_id UUID PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  vq_act1 NUMERIC,
  vq_act4 NUMERIC,
  hq_act4 NUMERIC,
  reflexivity_r NUMERIC,
  short_circuit_s NUMERIC,
  posttask_vq NUMERIC,
  posttask_hq NUMERIC,
  computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  computation_version VARCHAR(50) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memos_participant ON memos(participant_id);
CREATE INDEX IF NOT EXISTS idx_memos_act ON memos(act_number);
CREATE INDEX IF NOT EXISTS idx_chat_logs_participant ON chat_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_act ON chat_logs(act_number);
CREATE INDEX IF NOT EXISTS idx_event_logs_participant ON event_logs(participant_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_act ON event_logs(act_number);
CREATE INDEX IF NOT EXISTS idx_event_logs_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_ratings_participant ON ratings(participant_id);
CREATE INDEX IF NOT EXISTS idx_ratings_act ON ratings(act_number);
CREATE INDEX IF NOT EXISTS idx_decision_events_participant ON decision_events(participant_id);
