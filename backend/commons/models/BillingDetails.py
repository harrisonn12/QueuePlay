from pydantic import BaseModel

class BillingDetails(BaseModel):
    cardNumber: str
    expMonth: str
    expYear: str
    cvc: str

