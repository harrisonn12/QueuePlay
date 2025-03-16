import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { CheckoutForm } from './CheckoutForm';

const stripePromise = loadStripe(
    'pk_test_51PRGvfBwG19OgdeMfVJPMyPleuHZ5BpjNWLmY7EeNLhcudaFZIvslqy8NyKa8NOBSkT7n4a6A9Y1qn40HIHLQJt600uKc8qeXR'
);

export const StripePaymentInformationSubmitter = () => {};
