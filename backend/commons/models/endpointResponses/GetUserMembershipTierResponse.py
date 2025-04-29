from pydantic import BaseModel
from typing import Optional

class GetUserMembershipTierResponse(BaseModel):
    error: Optional[str] = None
    message: Optional[str] = None
    tier: Optional[int] = None