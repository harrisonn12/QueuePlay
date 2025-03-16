import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(
    'pk_test_51PRGvfBwG19OgdeMfVJPMyPleuHZ5BpjNWLmY7EeNLhcudaFZIvslqy8NyKa8NOBSkT7n4a6A9Y1qn40HIHLQJt600uKc8qeXR'
);

const stripe = require('stripe')(
    'pk_test_51PRGvfBwG19OgdeMfVJPMyPleuHZ5BpjNWLmY7EeNLhcudaFZIvslqy8NyKa8NOBSkT7n4a6A9Y1qn40HIHLQJt600uKc8qeXR'
);

const paymentIntent = stripe.PaymentIntent.create({
    amount: 2000,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
});

const clientSecret = paymentIntent.client_secret;

export const StripePaymentInformationSubmitter = () => {
    const options = {
        clientSecret,
    };
    const customerID = 'cus_RwxzjN7isNHjD3';

    return <></>;
}
