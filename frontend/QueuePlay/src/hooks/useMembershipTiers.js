import { useEffect, useState } from 'react';
import axios from 'axios';

export const useMembershipTiers = () => {
    const [membershipTiers, setMembershipTiers] = useState(null);

    /* Get all existing membership tiers */
    useEffect(() => {
        axios
            .get('http://127.0.0.1:8000/paymentService/getMembershipTiers')
            .then((response) => {
                setMembershipTiers(response.data);
            })
            .catch((e) => {
                console.error('Error fetching membership tiers:', e);
            });
    }, []);

    return {
        membershipTiers,
    };
};
