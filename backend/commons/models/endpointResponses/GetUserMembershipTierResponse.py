from pydantic import BaseModel
from typing import Optional

class GetUserMembershipTierResponse(BaseModel):
    error: Optional[Exception] = None
    message: str = None
    tier: int = None