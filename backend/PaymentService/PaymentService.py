import stripe;


# pm_1R37QuBwG19OgdeMj5vWIAVc
customerId = "cus_RwxzjN7isNHjD3"

class PaymentService:
    def createPaymentMethod():
        stripe.api_key =    "pk_test_51PRGvfBwG19OgdeMfVJPMyPleuHZ5BpjNWLmY7EeNLhcudaFZIvslqy8NyKa8NOBSkT7n4a6A9Y1qn40HIHLQJt600uKc8qeXR"
        
        return  stripe.PaymentMethod.create(
            type="card",
            billing_details={
                "name": "John Doe",
                "email": "dandcalvo@gmail.com"
            },
            card={
                "number": "378282246310005",
                "exp_month": "02",
                "exp_year": "2035"
            }
        )
    
    def createIntent(paymentMethodID):
        stripe.api_key = "sk_test_51PRGvfBwG19OgdeM0xDu2vd19OEO5gxh1fXOPMAXZmvJrIX31MlT6twogvrHcPCsujo8VXjKj5Hk1CYHfKyTWSVH0072YeGqfc"
        
        return stripe.SetupIntent.create(payment_method=paymentMethodID);