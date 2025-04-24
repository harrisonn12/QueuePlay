import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

export default function useMembershipTiers() {
    const [membershipTiers, setMembershipTiers] = useState(null);
    const { user } = useAuth0();

    /* Get all existing membership tiers */
    useEffect(() => {
        axios
            .get('http://127.0.0.1:8000/paymentService/getMembershipTiers')
            .then((response) => {
                response = response.data.data;
                response = response.replaceAll("'", '"');
                response = response.replaceAll('None', '"null"');
                response = JSON.parse(response);
                setMembershipTiers(response);
            })
            .catch((e) => {
                console.error('Error fetching data:', e);
            });
    }, []);

    /* Capture the membership tier that the user is subscribed to */
    useEffect(() => {
        axios.get('http://127.0.0.1:8000/paymentService/getMembershipTiers')
    }, [user])

    return {
        membershipTiers,
    };
}
