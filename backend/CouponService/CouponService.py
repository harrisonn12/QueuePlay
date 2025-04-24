from CouponService.src.databases.Coupon import Coupon
from datetime import datetime, timezone

class CouponService:
    
    def __init__(self, availableOffersAdapter, offerSelectionProcessor, couponIdGenerator, couponsDatabase, couponRedemptionAdapter, customerMessagingProcessor) -> None:
        self.availableOffersAdapter = availableOffersAdapter  
        self.offerSelectionProcessor = offerSelectionProcessor 
        self.couponIdGenerator = couponIdGenerator  
        self.couponsDatabase = couponsDatabase
        self.couponRedemptionAdapter = couponRedemptionAdapter
        self.customerMessagingProcessor = customerMessagingProcessor

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
    def assignCoupon(self, couponId: str, winnerId: int):
        coupon = self.couponsDatabase.getCouponById(couponId)

        if coupon is None:
            raise ValueError("Coupon not found")
        if coupon.assigned:
            raise ValueError("Coupon already assigned")
        
        self.couponsDatabase.assignWinner(couponId, winnerId)

        self.couponRedemptionAdapter.redeem(couponId)
        self.customerMessagingProcessor.sendWinnerCoupon(couponId, winnerId)

        return coupon

    # Returns a list of coupons associated with a store and a gamer
    def getCoupon(self, storeId: int, gamerId: str):
        return self.couponsDatabase.getGamerCoupons(storeId, gamerId)
    
    # Destroys the coupon if it exists
    def destroyCoupon(self, couponId: str):
        response = self.couponsDatabase.destroyCoupon(couponId)
        if response:
            return response
        else:
            raise ValueError("Coupon not found")
        