from pydantic import BaseModel

class Gamer(BaseModel):
    gamerId: str
    coupons: list
    phoneNumber: str
