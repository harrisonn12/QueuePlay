-- Migration: Create couponOffers table for store offer management
-- Description: Creates table to store coupon offers that can be managed by store owners

-- Create the couponOffers table
CREATE TABLE IF NOT EXISTS couponOffers (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL,
    offer_type VARCHAR(20) NOT NULL CHECK (offer_type IN ('bogo', 'discount', 'free')),
    value VARCHAR(100),
    count INTEGER NOT NULL DEFAULT 1 CHECK (count > 0 AND count <= 10000),
    product_id INTEGER NOT NULL CHECK (product_id > 0),
    expiration_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_couponOffers_store_id ON couponOffers (store_id);
CREATE INDEX IF NOT EXISTS idx_couponOffers_active ON couponOffers (is_active);
CREATE INDEX IF NOT EXISTS idx_couponOffers_expiration ON couponOffers (expiration_date);
CREATE INDEX IF NOT EXISTS idx_couponOffers_store_active ON couponOffers (store_id, is_active);

-- Create function to update the updatedAt timestamp
CREATE OR REPLACE FUNCTION update_couponOffers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updatedAt
CREATE TRIGGER trigger_couponOffers_updated_at
    BEFORE UPDATE ON couponOffers
    FOR EACH ROW
    EXECUTE FUNCTION update_couponOffers_updated_at();

-- Add constraint to ensure expiration date is in the future
ALTER TABLE couponOffers ADD CONSTRAINT check_future_expiration 
CHECK (expiration_date > NOW());

-- Insert sample offers for testing (store ID 1)
INSERT INTO couponOffers (store_id, offer_type, value, count, product_id, expiration_date) VALUES
(1, 'discount', '20% OFF Coffee', 50, 1, NOW() + INTERVAL '3 months'),
(1, 'bogo', NULL, 30, 1, NOW() + INTERVAL '2 months'),
(1, 'free', NULL, 20, 2, NOW() + INTERVAL '1 month'),
(1, 'discount', '15% OFF All Items', 40, 999, NOW() + INTERVAL '6 months');

-- Add comments for documentation
COMMENT ON TABLE couponOffers IS 'Stores coupon offers that can be managed by store owners and used for coupon generation';
COMMENT ON COLUMN couponOffers.store_id IS 'ID of the store that owns this offer';
COMMENT ON COLUMN couponOffers.offer_type IS 'Type of offer: bogo, discount, or free';
COMMENT ON COLUMN couponOffers.value IS 'Human-readable description of the offer (null for bogo/free offers)';
COMMENT ON COLUMN couponOffers.count IS 'Weight for random selection (higher = more likely to be chosen)';
COMMENT ON COLUMN couponOffers.product_id IS 'ID of the product this offer applies to (999 = all products)';
COMMENT ON COLUMN couponOffers.expiration_date IS 'When this offer expires';
COMMENT ON COLUMN couponOffers.is_active IS 'Whether this offer is currently active';

-- Grant permissions for the application
GRANT SELECT, INSERT, UPDATE, DELETE ON couponOffers TO postgres;
GRANT USAGE, SELECT ON SEQUENCE couponOffers_id_seq TO postgres;