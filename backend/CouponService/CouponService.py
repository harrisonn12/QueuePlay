from CouponService.src.databases.Coupon import Coupon
from datetime import datetime, timezone

class CouponService:
    
    def __init__(self, availableOffersAdapter, offerSelectionProcessor, couponIdGenerator, couponsDatabase, gamersDatabase) -> None:
        self.availableOffersAdapter = availableOffersAdapter  
        self.offerSelectionProcessor = offerSelectionProcessor 
        self.couponIdGenerator = couponIdGenerator  
        self.couponsDatabase = couponsDatabase
        self.gamersDatabase = gamersDatabase

    def createCoupon(self, storeId: int, gameId: int):
        availableOffers = self.availableOffersAdapter.get(storeId, gameId)
        
        if not availableOffers:
            raise ValueError("No available coupons for this store")

        chosenOffer = self.offerSelectionProcessor.pick(availableOffers)
        couponId = self.couponIdGenerator.generate(storeId, gameId)

        newCoupon = Coupon(
            couponId=couponId,
            storeId=storeId,
            gameId=gameId,
            winnerId="", 
            type=chosenOffer.offerType,
            value=chosenOffer.value,
            productId=chosenOffer.productId,
            assigned=False,
            createdAt = datetime.now(timezone.utc).isoformat(),
            expirationDate = chosenOffer.expirationDate
        )
        
        self.couponsDatabase.addCoupon(newCoupon)
        return newCoupon.__dict__
    
    # Assigns a winner to a coupon
    def assignCoupon(self, couponId: str, winnerId: str):
        coupon = self.couponsDatabase.getCouponById(couponId)

        if coupon is None:
            raise ValueError("Coupon not found")
        if coupon.assigned:
            raise ValueError("Coupon already assigned")
        
        self.couponsDatabase.assignWinner(couponId, winnerId)
        self.gamersDatabase.addCouponToGamer(couponId, winnerId)

        return coupon

    # Returns a list of coupons associated with a store and a gamer
    def getCoupons(self, storeId: int, gamerId: str):
        return self.couponsDatabase.getGamerCoupons(storeId, gamerId)
    
    # Destroys the coupon if it exists. Return true if deleled, false if still in database.
    def destroyCoupon(self, couponId: str) -> bool:
        coupon = self.couponsDatabase.getCouponById(couponId)
        if coupon is None:
            return True
        
        success = self.couponsDatabase.destroyCoupon(couponId) and self.gamersDatabase.removeCouponFromGamer(couponId, coupon.winnerId)
        return success

        