from pydantic import BaseModel
from typing import Optional

class GetMembershipTiersResponse(BaseModel):
    error: Optional[str] = None
    message: Optional[str] = None
    tiers: Optional[list] = None