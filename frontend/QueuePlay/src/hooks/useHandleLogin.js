import { useEffect, useState } from 'react';
import axios from 'axios';

export const useHandleLogin = (user) => {
    const [userOutputData, setUserOutputData] = useState();

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

    return JSON.stringify(userOutputData);
};
