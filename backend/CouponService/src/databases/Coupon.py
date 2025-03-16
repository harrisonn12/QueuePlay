from pydantic import BaseModel

class Coupon(BaseModel):
    couponId: str
    storeId: int
    gameId: int
    winnerId: str  
    type: str
    value: str
    productId: int
    assigned: bool
    createdAt: float
    expirationDate: str