-- Database schema for Tsinghua SEM Business Simulation Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (participants and researchers)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('participant', 'researcher', 'admin')),
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Research sessions
CREATE TABLE research_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Scenarios
CREATE TABLE scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Participants (links users to research sessions)
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
    participant_code VARCHAR(100) UNIQUE,
    demographics JSONB,
    covariates JSONB,
    mode VARCHAR(10) CHECK (mode IN ('C0', 'C1', 'C2')),
    status VARCHAR(20) DEFAULT 'started' CHECK (status IN ('started', 'completed')),
    language VARCHAR(50),
    device VARCHAR(100),
    timezone VARCHAR(100),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, session_id)
);

-- Simulation sessions (participant's active simulation)
CREATE TABLE simulation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES scenarios(id),
    current_round INTEGER DEFAULT 1,
    total_rounds INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
    mode VARCHAR(10) CHECK (mode IN ('C0', 'C1', 'C2')),
    current_act INTEGER DEFAULT 1 CHECK (current_act >= 1 AND current_act <= 4),
    identity_track VARCHAR(100),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    state_snapshot JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Decisions
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_session_id UUID REFERENCES simulation_sessions(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    category_id VARCHAR(100) NOT NULL,
    category_type VARCHAR(50) NOT NULL,
    values JSONB NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    time_spent INTEGER, -- in milliseconds
    intermediate_changes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Decision events (act-level decisions)
CREATE TABLE decision_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_session_id UUID REFERENCES simulation_sessions(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    act_number INTEGER NOT NULL CHECK (act_number >= 1 AND act_number <= 4),
    option_id VARCHAR(50) NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    decision_time_ms INTEGER,
    confidence INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Decision timing (detailed timing information)
CREATE TABLE decision_timing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration INTEGER, -- in milliseconds
    pauses JSONB, -- array of pause events
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Outcomes (calculated results after each round)
CREATE TABLE outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_session_id UUID REFERENCES simulation_sessions(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    metrics JSONB NOT NULL,
    state_snapshot JSONB NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(simulation_session_id, round)
);

-- Act Progress table (tracks progress through each act)
CREATE TABLE act_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_session_id UUID REFERENCES simulation_sessions(id) ON DELETE CASCADE,
    act_number INTEGER NOT NULL CHECK (act_number >= 1 AND act_number <= 4),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(simulation_session_id, act_number)
);

-- Document Events table (tracks document open/close interactions)
CREATE TABLE document_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_session_id UUID REFERENCES simulation_sessions(id) ON DELETE CASCADE,
    act_number INTEGER NOT NULL CHECK (act_number >= 1 AND act_number <= 4),
    document_id VARCHAR(100) NOT NULL,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- State snapshots (before and after each round)
CREATE TABLE state_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_session_id UUID REFERENCES simulation_sessions(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    snapshot_type VARCHAR(50) NOT NULL CHECK (snapshot_type IN ('before', 'after')),
    state_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Interaction events (for tracking user interactions)
CREATE TABLE interaction_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_session_id UUID REFERENCES simulation_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Memos
CREATE TABLE memos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    act_number INTEGER NOT NULL CHECK (act_number >= 1 AND act_number <= 4),
    text TEXT NOT NULL,
    word_count INTEGER,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat logs (C1/C2)
CREATE TABLE chat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    act_number INTEGER NOT NULL CHECK (act_number >= 1 AND act_number <= 4),
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    meta JSONB
);

-- Event logs (single source of truth for events)
CREATE TABLE event_logs (
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
CREATE TABLE ratings (
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
CREATE TABLE computed_scores (
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

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_participants_user_id ON participants(user_id);
CREATE INDEX idx_participants_session_id ON participants(session_id);
CREATE INDEX idx_simulation_sessions_participant ON simulation_sessions(participant_id);
CREATE INDEX idx_simulation_sessions_scenario ON simulation_sessions(scenario_id);
CREATE INDEX idx_simulation_sessions_mode ON simulation_sessions(mode);
CREATE INDEX idx_decisions_simulation_session ON decisions(simulation_session_id);
CREATE INDEX idx_decisions_round ON decisions(round);
-- Composite index for common query pattern: get decisions by session and round
CREATE INDEX idx_decisions_session_round ON decisions(simulation_session_id, round);
CREATE INDEX idx_outcomes_simulation_session ON outcomes(simulation_session_id);
CREATE INDEX idx_outcomes_round ON outcomes(round);
CREATE INDEX idx_state_snapshots_simulation_session ON state_snapshots(simulation_session_id);
CREATE INDEX idx_decision_events_session ON decision_events(simulation_session_id);
CREATE INDEX idx_decision_events_act ON decision_events(act_number);
CREATE INDEX idx_decision_events_participant ON decision_events(participant_id);
-- Composite index for common query pattern: get decision events by participant and act
CREATE INDEX idx_decision_events_participant_act ON decision_events(participant_id, act_number);
CREATE INDEX idx_act_progress_session ON act_progress(simulation_session_id);
CREATE INDEX idx_act_progress_act ON act_progress(act_number);
CREATE INDEX idx_document_events_session ON document_events(simulation_session_id);
CREATE INDEX idx_document_events_act ON document_events(act_number);
CREATE INDEX idx_interaction_events_simulation_session ON interaction_events(simulation_session_id);
CREATE INDEX idx_simulation_sessions_current_act ON simulation_sessions(current_act);
CREATE INDEX idx_simulation_sessions_identity_track ON simulation_sessions(identity_track);
CREATE INDEX idx_memos_participant ON memos(participant_id);
CREATE INDEX idx_memos_act ON memos(act_number);
CREATE INDEX idx_chat_logs_participant ON chat_logs(participant_id);
CREATE INDEX idx_chat_logs_act ON chat_logs(act_number);
CREATE INDEX idx_event_logs_participant ON event_logs(participant_id);
CREATE INDEX idx_event_logs_act ON event_logs(act_number);
CREATE INDEX idx_event_logs_type ON event_logs(event_type);
CREATE INDEX idx_ratings_participant ON ratings(participant_id);
CREATE INDEX idx_ratings_act ON ratings(act_number);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_sessions_updated_at BEFORE UPDATE ON research_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_simulation_sessions_updated_at BEFORE UPDATE ON simulation_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();