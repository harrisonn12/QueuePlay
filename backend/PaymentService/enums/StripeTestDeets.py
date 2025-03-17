from enum import Enum

class StripeTestDeets(Enum):
    # Client-side operations
    PUBLISHKEY="pk_test_51PRGvfBwG19OgdeMfVJPMyPleuHZ5BpjNWLmY7EeNLhcudaFZIvslqy8NyKa8NOBSkT7n4a6A9Y1qn40HIHLQJt600uKc8qeXR"
    
    # Server-side operations
    SECRETKEY="sk_test_51PRGvfBwG19OgdeM0xDu2vd19OEO5gxh1fXOPMAXZmvJrIX31MlT6twogvrHcPCsujo8VXjKj5Hk1CYHfKyTWSVH0072YeGqfc"
    
    # Billing Details
    BILLINGDEETS={
        "name": "John Doe",
        "email": "dandcalvo@gmail.com"
    }

    # Card Details
    CARDDEETS={
        "number": "378282246310005",
        "exp_month": "02",
        "exp_year": "2035",
        "cvc": "215"
    }

    CUSTOMERID = "cus_RwxzjN7isNHjD3"