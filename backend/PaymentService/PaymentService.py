import stripe;

# Client-side operations
publishKey ="pk_test_51PRGvfBwG19OgdeMfVJPMyPleuHZ5BpjNWLmY7EeNLhcudaFZIvslqy8NyKa8NOBSkT7n4a6A9Y1qn40HIHLQJt600uKc8qeXR"

# Server-side operaitons
secretKey = "sk_test_51PRGvfBwG19OgdeM0xDu2vd19OEO5gxh1fXOPMAXZmvJrIX31MlT6twogvrHcPCsujo8VXjKj5Hk1CYHfKyTWSVH0072YeGqfc"

customerId = "cus_RwxzjN7isNHjD3"

billingDeets = {
        "name": "John Doe",
        "email": "dandcalvo@gmail.com"
    }
    
cardDeets = {
        "number": "378282246310005",
        "exp_month": "02",
        "exp_year": "2035",
        "cvc": "215"
    }

class PaymentService:
    
    def createPaymentMethod(billingDetails=billingDeets, cardDetails=cardDeets):
        stripe.api_key = publishKey
        
        return stripe.PaymentMethod.create(
            type="card",
            billing_details=billingDetails,
            card=cardDetails
        )
    
    # Acquire customer payment method without charging
    def createSetupIntent(paymentMethodID, customerId = customerId):
        # creating intent requires secret key
        stripe.api_key = secretKey
        
        intent = stripe.SetupIntent.create(
                automatic_payment_methods={
                    "enabled": True,
                    "allow_redirects": "never"
                },
                customer = customerId,
                payment_method = paymentMethodID,
                usage="off_session",
                confirm=True
            )
        
        stripe.Customer.modify(
            customerId,
            invoice_settings={
                "default_payment_method": paymentMethodID
            }
        )
        
        return intent

    def createPaymentIntent(customerId, paymentMethodId):
        stripe.api_key = secretKey;
    
        paymentIntent = stripe.PaymentIntent.create(
            amount=985,
            currency="usd",
            customer=customerId,
            payment_method=paymentMethodId,
            automatic_payment_methods={
                "enabled": True,
                "allow_redirects": "never"
            }
        )

        return stripe.PaymentIntent.confirm(paymentIntent.id)


    def displayAllSetupIntents():
        stripe.api_key = secretKey

        return stripe.SetupIntent.list();

    def cancelAllSetupIntents():
        stripe.api_key = secretKey

        # get all SetupIntents
        setupIntents = stripe.SetupIntent.list().data
        
        if (len(setupIntents) == 0):
            return 'No existing setupIntents'
        
        # cancel each SetupIntent
        for intent in setupIntents:
            stripe.SetupIntent.cancel(intent.id)

        return stripe.SetupIntent.list();