-- Migration: Add ai_attitude_responses table
-- This table stores AI attitude and trust responses from participants in C1 and C2 conditions

CREATE TABLE IF NOT EXISTS ai_attitude_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_session_id UUID REFERENCES simulation_sessions(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    
    -- General AI Attitudes (1-7 Likert)
    general_ai_trust_1 INTEGER CHECK (general_ai_trust_1 >= 1 AND general_ai_trust_1 <= 7),
    general_ai_trust_2 INTEGER CHECK (general_ai_trust_2 >= 1 AND general_ai_trust_2 <= 7), -- (R) reversed
    general_ai_trust_3 INTEGER CHECK (general_ai_trust_3 >= 1 AND general_ai_trust_3 <= 7),
    general_ai_trust_4 INTEGER CHECK (general_ai_trust_4 >= 1 AND general_ai_trust_4 <= 7),
    
    -- Simulation-Specific AI Trust (1-7 Likert)
    simulation_ai_trust_1 INTEGER CHECK (simulation_ai_trust_1 >= 1 AND simulation_ai_trust_1 <= 7),
    simulation_ai_trust_2 INTEGER CHECK (simulation_ai_trust_2 >= 1 AND simulation_ai_trust_2 <= 7),
    simulation_ai_trust_3 INTEGER CHECK (simulation_ai_trust_3 >= 1 AND simulation_ai_trust_3 <= 7),
    
    -- AI Usage Frequency (1-5)
    ai_usage_frequency INTEGER CHECK (ai_usage_frequency >= 1 AND ai_usage_frequency <= 5),
    
    -- Store raw responses as JSONB for flexibility
    responses JSONB,
    
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(simulation_session_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_attitude_session ON ai_attitude_responses(simulation_session_id);
CREATE INDEX IF NOT EXISTS idx_ai_attitude_participant ON ai_attitude_responses(participant_id);
