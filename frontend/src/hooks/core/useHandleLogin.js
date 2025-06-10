import { useEffect, useState } from 'react';
import axios from 'axios';

export const useHandleLogin = (auth0Id) => {
    const [userData, setUserData] = useState();

    useEffect(() => {
        axios
            .post(
                `http://127.0.0.1:8000/paymentdb/handleUserLogin?auth0Id=${auth0Id}`
            )
            .then((response) => {
                setUserData(response.data.data);
            })
            .catch((e) => {
                console.error('Error fetching data:', e);
            });
    }, [auth0Id]);

    return JSON.stringify(userData);
};
