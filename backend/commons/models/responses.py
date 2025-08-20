from pydantic import BaseModel
from typing import Optional, Any

class BaseResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None

class UserAccountResponse(BaseModel):
    id: Optional[str] = None
    name: str
    email: str
    phone: Optional[str] = None
    auth0Id: Optional[str] = None
    stripeCustomerId: Optional[str] = None

class PaymentMethodResponse(BaseModel):
    id: str
    type: str
    last4: Optional[str] = None
    brand: Optional[str] = None
    expMonth: Optional[int] = None
    expYear: Optional[int] = None

class PaymentIntentResponse(BaseModel):
    id: str
    amount: int
    currency: str
    status: str
    customerId: str
