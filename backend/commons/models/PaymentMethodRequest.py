from pydantic import BaseModel

class PaymentMethodRequest(BaseModel):
    customerId: str =""
    paymentMethodId: str =""
    defaultPaymentMethod: bool = ""