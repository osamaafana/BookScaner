-- Database User Setup for BookScanner
-- Creates separate users with least-privilege access

-- Create application user (read/write access)
CREATE USER bookscanner_app WITH PASSWORD 'secure_app_password_here';
GRANT CONNECT ON DATABASE bookscanner TO bookscanner_app;
GRANT USAGE ON SCHEMA public TO bookscanner_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bookscanner_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bookscanner_app;

-- Create migration user (full access for schema changes)
CREATE USER bookscanner_migration WITH PASSWORD 'secure_migration_password_here';
GRANT CONNECT ON DATABASE bookscanner TO bookscanner_migration;
GRANT ALL PRIVILEGES ON DATABASE bookscanner TO bookscanner_migration;
GRANT ALL PRIVILEGES ON SCHEMA public TO bookscanner_migration;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bookscanner_migration;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bookscanner_migration;

-- Create read-only user for monitoring/analytics
CREATE USER bookscanner_readonly WITH PASSWORD 'secure_readonly_password_here';
GRANT CONNECT ON DATABASE bookscanner TO bookscanner_readonly;
GRANT USAGE ON SCHEMA public TO bookscanner_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bookscanner_readonly;

-- Create backup user (for automated backups)
CREATE USER bookscanner_backup WITH PASSWORD 'secure_backup_password_here';
GRANT CONNECT ON DATABASE bookscanner TO bookscanner_backup;
GRANT USAGE ON SCHEMA public TO bookscanner_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bookscanner_backup;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bookscanner_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO bookscanner_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO bookscanner_migration;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO bookscanner_migration;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO bookscanner_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO bookscanner_backup;

-- Create indexes for performance (if not already created)
CREATE INDEX IF NOT EXISTS idx_device_created_at ON device(created_at);
CREATE INDEX IF NOT EXISTS idx_book_fingerprint ON book(fingerprint);
CREATE INDEX IF NOT EXISTS idx_scan_device_id ON scan(device_id);
CREATE INDEX IF NOT EXISTS idx_preference_device_key ON preference(device_id, key);
CREATE INDEX IF NOT EXISTS idx_recommendation_device_id ON recommendation(device_id);

-- Security: Revoke unnecessary privileges from public schema
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

-- Log the setup
INSERT INTO device (id, created_at) VALUES (gen_random_uuid(), NOW()) ON CONFLICT DO NOTHING;
