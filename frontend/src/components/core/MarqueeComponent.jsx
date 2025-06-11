import React from 'react';
import Marquee from "react-fast-marquee";
import './MarqueeComponent.css';

const MarqueeComponent = () => {
    const placeholders = Array(2).fill("Coupon Placeholder");

    return (
        <div className="marquee-container">
            <Marquee speed={80} gradient={false}>
                {placeholders.map((text, index) => (
                    <span key={index} className="marquee-text">
                        {text}
                    </span>
                ))}
            </Marquee>
        </div>
    );
};

export default MarqueeComponent;
