import { useEffect, useState } from 'react';
import axios from 'axios';

export default function useFetchDatabase({ url }) {
    const [data, setData] = useState();

    useEffect(() => {
        axios
            .get('http://127.0.0.1:8000/paymentDatabase/read?table=membership')
            .then((response) => {
                setData(response);
            })
            .catch((e) => {
                console.error('Error fetching data:', e);
            });
    }, [url]);

    return data;
}
