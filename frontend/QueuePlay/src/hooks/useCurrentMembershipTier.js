import { useEffect, useState } from 'react';
import axios from 'axios';

export const useCurrentMembershipTier = (auth0ID) => {
    const [currentMembershipTier, setCurrentMembershipTier] = useState(null);

    /* Capture the membership tier that the user is subscribed to */
    useEffect(() => {
        axios
            .get('http://127.0.0.1:8000/paymentService/getUserMembershipTier', {
                params: {
                    auth0ID,
                },
            })
            .then((response) => {
                response = response.data;
                setCurrentMembershipTier(response);
             })
            .catch((e) => {
                console.error('Error fetching client membership tier:', e);
            });
    }, [auth0ID]);

    return {
        currentMembershipTier,
    };
};
