# requires dictionary containing a "message"
class PaymentMethodExistsException(Exception):
    def __init__(self, message: str, paymentMethodId: str, setupIntentId: str):
        super().__init__(message)
        self.paymentMethodId= paymentMethodId
        self.setupIntentId = setupIntentId