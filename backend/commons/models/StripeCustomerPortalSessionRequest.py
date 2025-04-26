from pydantic import BaseModel

class StripeCustomerPortalSessionRequest(BaseModel):
    auth0ID: str = ""
    returnURL: str = ""