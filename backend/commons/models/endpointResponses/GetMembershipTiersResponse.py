from pydantic import BaseModel
from typing import Optional

class GetMembershipTiersResponse(BaseModel):
    error: Optional[Exception] = None
    message: str = None
    tiers: list = None