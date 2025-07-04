-- Migration: Create products table for store product management
-- Description: Creates table to store products that can be associated with offers

-- Create the products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products (store_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_store_active ON products (store_id, is_active);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_products_updated_at();

-- Insert default products for testing (store ID 1)
INSERT INTO products (store_id, name, description) VALUES
(1, 'All Products', 'Applies to all products in the store'),
(1, 'Coffee', 'All coffee beverages'),
(1, 'Pastries', 'Baked goods and pastries'),
(1, 'Sandwiches', 'Lunch items and sandwiches'),
(1, 'Beverages', 'Non-coffee drinks'),
(1, 'Snacks', 'Light snacks and treats');

-- Add comments for documentation
COMMENT ON TABLE products IS 'Stores products that can be associated with offers';
COMMENT ON COLUMN products.store_id IS 'ID of the store that owns this product';
COMMENT ON COLUMN products.name IS 'Name of the product';
COMMENT ON COLUMN products.description IS 'Optional description of the product';
COMMENT ON COLUMN products.is_active IS 'Whether this product is currently active';

-- Grant permissions for the application
GRANT SELECT, INSERT, UPDATE, DELETE ON products TO postgres;
GRANT USAGE, SELECT ON SEQUENCE products_id_seq TO postgres;