from typing import Optional
from pydantic import BaseModel

class Coupon(BaseModel):
    couponId: str
    storeId: int
    gameId: str
    winnerId: Optional[str] = None
    type: str
    value: str
    productId: int
    assigned: bool
    createdAt: str
    expirationDate: str 
