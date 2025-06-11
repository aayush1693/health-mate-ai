-- =============================================================================
-- HealthMate AI - PostgreSQL Database Setup Script
-- =============================================================================
-- This script creates the database, user, and all necessary tables for the
-- HealthMate AI Medical Assistant System.
-- 
-- Run this script as a PostgreSQL superuser (e.g., postgres)
-- Command: sudo -u postgres psql -f database_setup.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CREATE DATABASE AND USER
-- -----------------------------------------------------------------------------

-- Drop database if exists (BE CAREFUL IN PRODUCTION!)
-- DROP DATABASE IF EXISTS healthmate_db;

-- Drop user if exists
-- DROP USER IF EXISTS healthmate_user;

-- Create the database user with password
CREATE USER healthmate_user WITH PASSWORD 'healthmate_password';

-- Create the database
CREATE DATABASE healthmate_db
    WITH 
    OWNER = healthmate_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0
    CONNECTION LIMIT = -1;

-- Grant all privileges on database to user
GRANT ALL PRIVILEGES ON DATABASE healthmate_db TO healthmate_user;

-- Connect to the healthmate_db database
\c healthmate_db

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO healthmate_user;

-- -----------------------------------------------------------------------------
-- 2. CREATE EXTENSIONS
-- -----------------------------------------------------------------------------

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 3. CREATE TABLES
-- -----------------------------------------------------------------------------

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    profile_image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_role_values CHECK (role IN ('USER', 'ADMIN', 'DOCTOR'))
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on role for filtering
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Verification codes table
CREATE TABLE IF NOT EXISTS verification_codes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    code VARCHAR(10) NOT NULL,
    type VARCHAR(30) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_verification_codes_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT verification_codes_type_values CHECK (type IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET'))
);

-- Create indexes for verification codes
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_type ON verification_codes(type);

-- Disease predictions table (for storing user prediction history)
CREATE TABLE IF NOT EXISTS disease_predictions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    model_type VARCHAR(50) NOT NULL,
    prediction VARCHAR(100) NOT NULL,
    confidence DECIMAL(5,2) NOT NULL,
    image_path VARCHAR(500),
    recommendation TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_predictions_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE SET NULL,
    
    -- Constraints
    CONSTRAINT predictions_model_type_values CHECK (model_type IN ('pneumonia', 'lung_cancer', 'alzheimer')),
    CONSTRAINT predictions_confidence_range CHECK (confidence >= 0 AND confidence <= 100)
);

-- Create indexes for predictions
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON disease_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_model_type ON disease_predictions(model_type);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON disease_predictions(created_at DESC);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    session_uuid VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_chat_sessions_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for chat sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_uuid ON chat_sessions(session_uuid);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id) 
        REFERENCES chat_sessions(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chat_messages_role_values CHECK (role IN ('user', 'assistant', 'system'))
);

-- Create indexes for chat messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- User appointments table (optional, for future features)
CREATE TABLE IF NOT EXISTS appointments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    hospital_name VARCHAR(255),
    specialty VARCHAR(100),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_appointments_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT appointments_status_values CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'))
);

-- Create indexes for appointments
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- -----------------------------------------------------------------------------
-- 4. CREATE FUNCTIONS AND TRIGGERS
-- -----------------------------------------------------------------------------

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for chat_sessions table
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for appointments table
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 5. GRANT PERMISSIONS
-- -----------------------------------------------------------------------------

-- Grant all privileges on all tables to healthmate_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO healthmate_user;

-- Grant all privileges on all sequences to healthmate_user
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO healthmate_user;

-- Grant execute on all functions to healthmate_user
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO healthmate_user;

-- -----------------------------------------------------------------------------
-- 6. INSERT DEFAULT/SAMPLE DATA (OPTIONAL)
-- -----------------------------------------------------------------------------

-- Insert a default admin user (password: admin123 - hashed with bcrypt)
-- Note: In production, change this password immediately!
INSERT INTO users (first_name, last_name, email, password, role, email_verified, enabled)
VALUES (
    'Admin',
    'User',
    'admin@healthmate.com',
    '$2a$10$XQxBtHBLKlEXAGJZQ5fNjuGZVGWJBJrVCJzwJGQJ5MXqXg5PQxXXm', -- admin123
    'ADMIN',
    TRUE,
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. VERIFICATION QUERIES
-- -----------------------------------------------------------------------------

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verify indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Show table structures
\dt+ public.*

-- -----------------------------------------------------------------------------
-- END OF SCRIPT
-- -----------------------------------------------------------------------------

-- =============================================================================
-- ADDITIONAL COMMANDS FOR DATABASE MANAGEMENT
-- =============================================================================

-- To connect to the database:
-- psql -h localhost -U healthmate_user -d healthmate_db

-- To backup the database:
-- pg_dump -h localhost -U healthmate_user -d healthmate_db > healthmate_backup.sql

-- To restore the database:
-- psql -h localhost -U healthmate_user -d healthmate_db < healthmate_backup.sql

-- To drop the database (CAUTION!):
-- DROP DATABASE IF EXISTS healthmate_db;

-- To drop the user (CAUTION!):
-- DROP USER IF EXISTS healthmate_user;
