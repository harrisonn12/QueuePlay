from pydantic import BaseModel

class PaymentServiceUserPayload(BaseModel):
        name: str = ""
        email: str = ""
        phone: str = ""
        auth0Id: str = ""