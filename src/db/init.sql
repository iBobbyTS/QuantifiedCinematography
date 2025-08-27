-- Initialize database with basic data
-- This script should be run after creating the tables

-- Insert basic product type
INSERT INTO product_types (id, name, created_at, updated_at) 
VALUES (0, 'None', NOW(), NOW());

-- Insert basic brand (assuming brands table has id 0)
INSERT INTO brands (id, name, created_at, updated_at) 
VALUES (0, 'None', NOW(), NOW());

-- Insert basic product series
INSERT INTO product_series (id, name, brand_id, product_type_id, created_at, updated_at) 
VALUES (0, 'None', 0, 0, NOW(), NOW());

-- Reset sequences to start from 1 for future inserts
SELECT setval('product_types_id_seq', 1, false);
SELECT setval('brands_id_seq', 1, false);
SELECT setval('product_series_id_seq', 1, false);
