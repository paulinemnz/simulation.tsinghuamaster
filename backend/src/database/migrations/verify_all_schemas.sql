-- Schema Verification Script
-- Checks that all critical tables have the required columns

DO $$
DECLARE
    missing_columns TEXT[];
    tbl_name TEXT;
    required_cols TEXT[];
    col TEXT;
    has_issues BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '=== Starting Schema Verification ===';
    
    -- Verify decision_events table
    tbl_name := 'decision_events';
    required_cols := ARRAY['id', 'simulation_session_id', 'participant_id', 'act_number', 'option_id', 'submitted_at', 'decision_time_ms', 'confidence', 'created_at'];
    missing_columns := ARRAY[]::TEXT[];
    
    FOREACH col IN ARRAY required_cols
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = tbl_name
            AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING 'Table % is missing columns: %', tbl_name, array_to_string(missing_columns, ', ');
        has_issues := TRUE;
    ELSE
        RAISE NOTICE '✓ Table % has all required columns', tbl_name;
    END IF;
    
    -- Verify act_progress table
    tbl_name := 'act_progress';
    required_cols := ARRAY['id', 'simulation_session_id', 'act_number', 'started_at', 'submitted_at', 'created_at'];
    missing_columns := ARRAY[]::TEXT[];
    
    FOREACH col IN ARRAY required_cols
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = tbl_name
            AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING 'Table % is missing columns: %', tbl_name, array_to_string(missing_columns, ', ');
        has_issues := TRUE;
    ELSE
        RAISE NOTICE '✓ Table % has all required columns', tbl_name;
    END IF;
    
    -- Verify document_events table
    tbl_name := 'document_events';
    required_cols := ARRAY['id', 'simulation_session_id', 'act_number', 'document_id', 'opened_at', 'closed_at', 'duration_ms', 'created_at'];
    missing_columns := ARRAY[]::TEXT[];
    
    FOREACH col IN ARRAY required_cols
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = tbl_name
            AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING 'Table % is missing columns: %', tbl_name, array_to_string(missing_columns, ', ');
        has_issues := TRUE;
    ELSE
        RAISE NOTICE '✓ Table % has all required columns', tbl_name;
    END IF;
    
    -- Verify simulation_sessions table has required columns
    tbl_name := 'simulation_sessions';
    required_cols := ARRAY['id', 'participant_id', 'scenario_id', 'current_act', 'identity_track', 'status', 'mode'];
    missing_columns := ARRAY[]::TEXT[];
    
    FOREACH col IN ARRAY required_cols
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = tbl_name
            AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING 'Table % is missing columns: %', tbl_name, array_to_string(missing_columns, ', ');
        has_issues := TRUE;
    ELSE
        RAISE NOTICE '✓ Table % has all required columns', tbl_name;
    END IF;
    
    -- Summary
    RAISE NOTICE '=== Schema Verification Complete ===';
    IF has_issues THEN
        RAISE WARNING 'Some tables are missing required columns. Please run the appropriate migrations.';
    ELSE
        RAISE NOTICE 'All tables have the required columns. Schema is valid.';
    END IF;
END $$;
