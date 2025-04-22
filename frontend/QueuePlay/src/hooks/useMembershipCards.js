import { useEffect, useState } from 'react';
import axios from 'axios';

export default function useMembershipCards() {
    const [membershipTiers, setMembershipTiers] = useState();

    useEffect(() => {
        axios
            .get('http://127.0.0.1:8000/paymentService/getMembershipTiers')
            .then((response) => {
                response = response.data.data;
                response = response.replaceAll("'", '"');
                response = JSON.parse(response);
                setMembershipTiers(response);
            })
            .catch((e) => {
                console.error('Error fetching data:', e);
            });
    }, []);

    return {
        membershipTiers,
    };
}
