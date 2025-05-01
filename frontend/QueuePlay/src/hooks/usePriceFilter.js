import { useState } from 'react';

export const usePriceFilter = () => {
    const [priceFilter, setPriceFilter] = useState('month');

    const handleMonthlyFilter = () => {
        setPriceFilter('month');
    };

    const handleYearlyFilter = () => {
        setPriceFilter('year');
    };

    return {
        priceFilter,
        handleMonthlyFilter,
        handleYearlyFilter,
    };
};
