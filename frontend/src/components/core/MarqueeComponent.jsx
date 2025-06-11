import React, { useState, useEffect } from 'react';
import Marquee from "react-fast-marquee";
import { authenticatedApiRequest } from '../../utils/api';
import { getStoredToken } from '../../utils/api/auth';
import './MarqueeComponent.css';

const MarqueeComponent = ({ gameId }) => {
    const [couponText, setCouponText] = useState("Loading coupon...");

    useEffect(() => {
        const fetchCoupon = async () => {
            if (!gameId) {
                setCouponText("No game active");
                return;
            }

            try {
                const token = getStoredToken();
                if (!token) {
                    setCouponText("Authentication required");
                    return;
                }

                const data = await authenticatedApiRequest('/createCoupon', {
                    method: 'POST',
                    body: JSON.stringify({
                        storeId: 1, // Hardcoded as suggested
                        gameId: gameId
                    })
                }, token);
                
                if (data && data.value) {
                    console.log("Coupon data is working:", data.value);
                    setCouponText(`${data.value}`);
                } else {
                    setCouponText("Special Offer Available!");
                }
            } catch (error) {
                console.error('Failed to fetch coupon:', error);
                setCouponText("Special Offer Available!");
            }
        };

        fetchCoupon();
    }, [gameId]);

    return (
        <div className="marquee-container">
            <Marquee speed={80} gradient={false}>
                <span className="marquee-text">
                    {couponText}
                </span>
            </Marquee>
        </div>
    );
};

export default MarqueeComponent;
