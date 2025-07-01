-- Migration: Setup pg_cron extension and coupon auto-expiration cleanup
-- Description: Enables pg_cron extension and creates scheduled job for automatic coupon cleanup

-- Enable pg_cron extension (requires superuser privileges)
-- This should be run by a database administrator or in Supabase dashboard SQL editor
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a new column to store expiration date as timestamp
ALTER TABLE coupons ADD COLUMN expiration_date_ts TIMESTAMPTZ;

-- Populate the new column with converted values
UPDATE coupons SET expiration_date_ts = cast("expirationDate" as timestamp);

-- Create index on the new expiration_date_ts column for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_coupons_expiration_date 
ON coupons (expiration_date_ts);

-- Create function to clean up expired coupons
CREATE OR REPLACE FUNCTION cleanup_expired_coupons()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired coupons
    DELETE FROM coupons 
    WHERE expiration_date_ts < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup activity
    INSERT INTO coupon_cleanup_log (cleanup_date, deleted_count) 
    VALUES (NOW(), deleted_count);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create table to log cleanup activities
CREATE TABLE IF NOT EXISTS coupon_cleanup_log (
    id SERIAL PRIMARY KEY,
    cleanup_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_count INTEGER NOT NULL DEFAULT 0
);

-- Schedule cleanup job to run every 2 hours
-- Job will be created with name 'coupon-auto-cleanup'
SELECT cron.schedule(
    'coupon-auto-cleanup',
    '0 */2 * * *',  -- Every 2 hours at minute 0
    'SELECT cleanup_expired_coupons();'
);

-- Grant necessary permissions for the cleanup function
-- This ensures the scheduled job can execute the function
GRANT EXECUTE ON FUNCTION cleanup_expired_coupons() TO postgres;

-- Create a view to easily monitor cleanup statistics
CREATE OR REPLACE VIEW coupon_cleanup_stats AS
SELECT 
    DATE(cleanup_date) as cleanup_date,
    COUNT(*) as cleanup_runs,
    SUM(deleted_count) as total_deleted,
    AVG(deleted_count) as avg_deleted_per_run,
    MAX(deleted_count) as max_deleted_single_run
FROM coupon_cleanup_log 
GROUP BY DATE(cleanup_date)
ORDER BY cleanup_date DESC;

-- Add comment to document the cleanup schedule
COMMENT ON FUNCTION cleanup_expired_coupons() IS 
'Automatically removes expired coupons from the database. Scheduled to run every 2 hours via pg_cron.';