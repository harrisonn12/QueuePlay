import { useEffect } from 'react';
import axios from 'axios';

export const useHandleLogin = (user) => {
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
            .catch((e) => {
                console.error('Error fetching data:', e);
            });
    }, [user]);
};
