from pydantic import BaseModel

class StripeCustomer(BaseModel):
    name: str = ""
    phone: str = ""
    email: str = ""