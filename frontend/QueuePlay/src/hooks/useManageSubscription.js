import axios from 'axios';

export const useManagementSubscription = async (event, user) => {
    event.preventDefault();

    try {
        const response = await axios.post(
            'http://127.0.0.1:8000/paymentService/createStripeCustomerPortalSession',
            {
                auth0ID: user.sub,
                returnURL: 'http://localhost:5173/',
            }
        );

        window.location.href = response.data.url;
    } catch (e) {
        console.error(`Error creating customer portal session: `, e);
    }
};
