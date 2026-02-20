-- Migration: Fix participants table schema
-- This migration adds all missing columns to the participants table to match schema.sql

-- Add status column
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'started' CHECK (status IN ('started', 'completed'));

-- Add covariates column
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS covariates JSONB;

-- Add language column
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS language VARCHAR(50);

-- Add device column
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS device VARCHAR(100);

-- Add timezone column
ALTER TABLE participants 
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100);
