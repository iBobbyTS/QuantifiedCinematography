-- Initialize database with basic data
-- This script should be run after creating the tables

-- Create sessions table for Lucia authentication
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Insert basic product type
INSERT INTO product_types (id, name, created_at, updated_at) 
VALUES (0, 'None', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert basic brand (assuming brands table has id 0)
INSERT INTO brands (id, name, created_at, updated_at) 
VALUES (0, 'None', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert basic product series
INSERT INTO product_series (id, name, brand_id, product_type_id, created_at, updated_at) 
VALUES (0, 'None', 0, 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert admin user
INSERT INTO users (username, display_name, email, password_hash, permission, created_at, updated_at) 
VALUES (
    'admin', 
    'Administrator', 
    'admin@quantifiedcinematography.com', 
    '$2b$12$77uo6iqUdnZnIeUrwkYsluXEfv.9JpkEyjwG1OhpXK.acD2nCHSc2', -- admin123
    65535, -- LIGHT | CAMERA | LENS permissions
    NOW(), 
    NOW()
)
ON CONFLICT (username) DO NOTHING;

-- Insert test user
INSERT INTO users (username, display_name, email, password_hash, permission, created_at, updated_at) 
VALUES (
    'test', 
    'Test User', 
    'test@quantifiedcinematography.com', 
    '$2b$12$mBsOvQmuNAH2aZOo2GZmQeZK4tXosMmSGaBnoYTYiBG7A2PJmM6Eu', -- test123
    1, -- LIGHT permission only
    NOW(), 
    NOW()
)
ON CONFLICT (username) DO NOTHING;

-- Reset sequences to start from 1 for future inserts
SELECT setval('product_types_id_seq', 1, false);
SELECT setval('brands_id_seq', 1, false);
SELECT setval('product_series_id_seq', 1, false);
