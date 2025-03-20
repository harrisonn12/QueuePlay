# requires dictionary containing a "message"
class DuplicatePaymentException(Exception):
    def __init__(self, message: str, paymentMethodId: str= None, customerId: str= None):
        super().__init__(message)
        self.paymentMethodId= paymentMethodId
        self.customerId= customerId
    
    def __str__(self):
        return f'DuplicatePaymentMethodException: {self.args[0]}; Customer ID: {self.customerId}, PaymentMethod ID: {self.paymentMethodId}'