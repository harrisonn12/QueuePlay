class PaymentMethodRequest():
    def __init__(self, customerId: str, paymentId: str, defaultPaymentMethod: bool):
        self.customerId = customerId
        self.paymentMethodId = paymentId
        self.defaultPaymentMethod = defaultPaymentMethod
