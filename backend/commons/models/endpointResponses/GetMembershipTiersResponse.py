from pydantic import BaseModel

class GetMembershipTiersResponse(BaseModel):
    error: str = None
    message: str = None
    tiers: list = None