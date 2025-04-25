import { useEffect, useState } from 'react';
import axios from 'axios';
import { UserMembershipTierContext } from '../context/UserMembershipTierContext';

export const useHandleLogin = (user) => {
    const [userOutputData, setUserOutputData] = useState(null);
    const [currentMembershipTier, setCurrentMembershipTier] = useState(null);

    /* Handle user login */
    useEffect(() => {
        const payload = {
            name: user.name,
            email: user.email,
            phone: user.phone_number,
            auth0Id: user.sub,
        };

        axios
            .post(
                `http://127.0.0.1:8000/paymentService/handleUserLogin`,
                payload
            )
            .then((response) => {
                setUserOutputData(response.data);
            })
            .catch((e) => {
                console.error('Error fetching data:', e);
            });
    }, [user]);

    /* Capture the membership tier that the user is subscribed to */
    useEffect(() => {
        axios
            .get('http://127.0.0.1:8000/paymentService/getUserMembershipTier', {
                params: {
                    auth0ID: user.sub,
                },
            })
            .then((response) => {
                response = +response.data.data;
                setCurrentMembershipTier(response);
            })
            .catch((e) => {
                console.error('Error fetching client membership tier:', e);
            });
    }, [user]);

    return {
        loginResponse: JSON.stringify(userOutputData),
        currentMembershipTier,
    };
};
