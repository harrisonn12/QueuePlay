from pydantic import BaseModel
from typing import Optional

class UserAccount(BaseModel):
    name: str = ''
    phone: Optional[str] = ''
    email: str = ''
    auth0Id: Optional[str] = None
    stripeCustomerId: Optional[str] = None