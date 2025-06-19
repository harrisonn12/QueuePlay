import React, { useState, useEffect } from 'react';
import Marquee from "react-fast-marquee";
import { authenticatedApiRequest } from '../../utils/api';
import { getStoredToken } from '../../utils/api/auth';
import './MarqueeComponent.css';

const MarqueeComponent = ({ gameId, couponData, role, sendGameMessage }) => {
    const [couponText, setCouponText] = useState("Loading coupon...");
    const [retryCount, setRetryCount] = useState(0);
    const maxRetries = 2;

    useEffect(() => {
        // If coupon data is provided (from host), use it
        if (couponData) {
            setCouponText(couponData);
            return;
        }

        // Only host fetches coupon data, players wait for it to be broadcast
        if (role !== 'host') {
            setCouponText("Waiting for offers...");
            return;
        }

        const fetchCoupon = async () => {
            if (!gameId) {
                setCouponText("Special Offer Available!");
                return;
            }

            try {
                const token = getStoredToken();
                if (!token) {
                    setCouponText("Special Offer Available!");
                    return;
                }

                console.log(`[MarqueeComponent] Fetching coupon for game ${gameId}, attempt ${retryCount + 1}`);

                const data = await authenticatedApiRequest('/createCoupon', {
                    method: 'POST',
                    body: JSON.stringify({
                        storeId: 1, // Hardcoded as suggested
                        gameId: gameId
                    })
                }, token);
                
                if (data && data.value) {
                    console.log("Host generated coupon:", data.value);
                    setCouponText(`${data.value}`);
                    
                    // Broadcast coupon to all players
                    if (sendGameMessage) {
                        sendGameMessage('couponUpdate', { coupon: data.value });
                    }
                } else if (data && data.error) {
                    // Backend returned an error but didn't throw
                    console.warn('Coupon service error:', data.error);
                    setCouponText("Special Offer Available!");
                } else {
                    setCouponText("Special Offer Available!");
                }
            } catch (error) {
                console.error('Failed to fetch coupon:', error);
                
                // Retry logic for network errors
                if (retryCount < maxRetries && (
                    error.message.includes('Failed to fetch') || 
                    error.message.includes('CORS') ||
                    error.message.includes('Network')
                )) {
                    console.log(`[MarqueeComponent] Retrying coupon fetch in 2 seconds... (${retryCount + 1}/${maxRetries})`);
                    setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                    }, 2000);
                } else {
                    // Give up and show fallback
                    console.log('[MarqueeComponent] Max retries reached or permanent error, using fallback');
                    setCouponText("Special Offer Available!");
                }
            }
        };

        fetchCoupon();
    }, [gameId, couponData, role, retryCount]);

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
