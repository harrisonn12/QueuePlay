import uuid

class CouponIdGenerator:

    def __init__(self):
        pass
        
    def generate(self, storeId: int, gameId: int) -> str:
        random_string = uuid.uuid4().hex[:32]  
        couponId = f"{storeId}-{gameId}-{random_string}"  
        return couponId