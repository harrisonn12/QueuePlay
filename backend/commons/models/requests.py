from pydantic import BaseModel, field_validator
from typing import Optional
import re

class CreateUserRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    auth0Id: Optional[str] = None
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not re.match(r"[^@]+@[^@]+\.[^@]+", v):
            raise ValueError('Invalid email format')
        return v

class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if v is not None and not re.match(r"[^@]+@[^@]+\.[^@]+", v):
            raise ValueError('Invalid email format')
        return v

class AddPaymentMethodRequest(BaseModel):
    customerId: str
    paymentMethodId: str
    defaultMethod: bool = False

class CreatePaymentIntentRequest(BaseModel):
    customerId: str
    paymentMethodId: str
    amount: int  # Amount in cents
    currency: str = "usd"

class PaymentMethodRequest(BaseModel):
    customerId: str
    paymentMethodId: str
    defaultPaymentMethod: bool = False
