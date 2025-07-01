-- Function to get expired coupons
-- This function is called by the Python application to retrieve expired coupons

CREATE OR REPLACE FUNCTION get_expired_coupons()
RETURNS TABLE (
    couponId text,
    storeId integer,
    gameId text,
    winnerId text,
    type text,
    value text,
    productId integer,
    assigned boolean,
    createdAt text,
    expirationDate text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.couponId,
        c.storeId,
        c.gameId,
        c.winnerId,
        c.type,
        c.value,
        c.productId,
        c.assigned,
        c.createdAt,
        c.expirationDate
    FROM coupons c
    WHERE cast(c.expirationDate as timestamp) < NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_expired_coupons() TO postgres;
GRANT EXECUTE ON FUNCTION get_expired_coupons() TO authenticated;