from sqlalchemy.orm import Session
from CouponService.models import Coupon
import time

class CouponService:
    
    def __init__(self, availableOffersAdapter, offerSelectionProcessor, couponIdGenerator, couponsDatabase) -> None:
        self.availableOffersAdapter = availableOffersAdapter  
        self.offerSelectionProcessor = offerSelectionProcessor 
        self.couponIdGenerator = couponIdGenerator  
        self.couponsDatabase = couponsDatabase  

    def createCoupon(self, db: Session, storeId: int, gameId: int):
        availableOffers = self.availableOffersAdapter.get(storeId, gameId)
        
        if not availableOffers:
            return {"error": "No available coupons for this store"}

        chosenOffer = self.offerSelectionProcessor.pick(availableOffers)
        couponId = self.couponIdGenerator.generate(storeId)

        newCoupon = Coupon(
            couponId=couponId,
            storeId=storeId,
            gameId=gameId,
            type=chosenOffer.type,
            value=chosenOffer.value,
            productId=chosenOffer.productId,
            assigned=False,
            createdAt = time.time(),
            expirationDate = chosenOffer.expirationDate
        )
        
        self.couponsDatabase.post(newCoupon)
        return newCoupon.__dict__
    
    def assignCoupon(self, couponId: str, gamerId: int):
        coupon = self.couponsDatabase.get(couponId)

    def getCoupon(self, storeId: int, gamerId: int):
        pass
    
    def destroyCoupon(self, storeId: int, couponId: int):
        pass

