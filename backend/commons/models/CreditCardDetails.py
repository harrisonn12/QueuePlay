from pydantic import BaseModel

class CreditCardDetails(BaseModel):
    cardNumber: str
    expMonth: str
    expYear: str
    cvc: str