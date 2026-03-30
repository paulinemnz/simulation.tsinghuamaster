-- Migration: Remove email storage from users table
-- Goal: delete any collected email addresses and ensure the system no longer stores emails.

DO $$
BEGIN
  -- If the legacy "email" column exists, migrate away from it.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
  ) THEN
    -- Drop legacy index if present
    IF EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_users_email'
    ) THEN
      EXECUTE 'DROP INDEX idx_users_email';
    END IF;

    -- Drop uniqueness constraint on email if present (name may vary; handle common default)
    IF EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'users_email_key'
    ) THEN
      EXECUTE 'ALTER TABLE users DROP CONSTRAINT users_email_key';
    END IF;

    -- Add identifier column if missing
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'identifier'
    ) THEN
      EXECUTE 'ALTER TABLE users ADD COLUMN identifier VARCHAR(255)';
    END IF;

    -- Populate identifier with non-email values (prefer name, otherwise user id)
    EXECUTE 'UPDATE users SET identifier = COALESCE(NULLIF(name, ''''), id::text) WHERE identifier IS NULL OR identifier = ''''';

    -- Enforce NOT NULL + uniqueness
    EXECUTE 'ALTER TABLE users ALTER COLUMN identifier SET NOT NULL';
    BEGIN
      EXECUTE 'ALTER TABLE users ADD CONSTRAINT users_identifier_key UNIQUE (identifier)';
    EXCEPTION WHEN duplicate_object THEN
      -- constraint already exists
    END;

    -- Finally, drop the email column (this deletes stored emails)
    EXECUTE 'ALTER TABLE users DROP COLUMN email';
  END IF;

  -- Ensure identifier index exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_users_identifier'
  ) THEN
    EXECUTE 'CREATE INDEX idx_users_identifier ON users(identifier)';
  END IF;
END $$;

