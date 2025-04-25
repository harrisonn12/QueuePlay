import { useEffect, useState } from 'react';
import axios from 'axios';

export const useFetchDatabase = (url) => {
    const [data, setData] = useState('');

    useEffect(() => {
        axios
            .get(`http://127.0.0.1:8000/paymentService/${url}`)
            .then((response) => {
                setData(response);
            })
            .catch((e) => {
                console.error('Error fetching data:', e);
            });
    }, [url]);

    return data;
};
