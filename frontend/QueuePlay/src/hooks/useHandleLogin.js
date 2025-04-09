import { useEffect, useState } from 'react';
import axios from 'axios';

export const useHandleLogin = (user) => {
    const [userOutputData, setUserOutputData] = useState();
    const payload = {
        name: user.name,
        email: user.email,
        phone: user.phone_number,
        auth0Id: user.auth0Id,
    };

    useEffect(() => {
        axios
            .post(`http://127.0.0.1:8000/paymentdb/handleUserLogin`, payload)
            .then((response) => {
                console.log(response);
                setUserOutputData(response.data);
            })
            .catch((e) => {
                console.error('Error fetching data:', e);
            });
    }, [user]);

    return JSON.stringify(userOutputData);
};
