import time
from CouponService.src.databases.Coupon import Coupon
import os

class CouponService:
    
    def __init__(self, availableOffersAdapter, offerSelectionProcessor, couponIdGenerator, couponsDatabase, assignedCouponDatabase, couponRedemptionAdapter, customerMessagingProcessor) -> None:
        self.availableOffersAdapter = availableOffersAdapter  
        self.offerSelectionProcessor = offerSelectionProcessor 
        self.couponIdGenerator = couponIdGenerator  
        self.couponsDatabase = couponsDatabase
        self.assignedCouponDatabase = assignedCouponDatabase
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
            winnerId="no winner",  # If set to 'None', posting to Google Sheets starts at the wrong column starting at row 2
            type=chosenOffer.offerType,
            value=chosenOffer.value,
            productId=chosenOffer.productgiId,
            assigned=False,
            createdAt = time.time(),
            expirationDate = chosenOffer.expirationDate
        )
        
        self.couponsDatabase.addCoupon(newCoupon)
        return newCoupon.__dict__
    
    # Currently just adding a new row to database instead of modifying old row's assigned value / winnerId
    def assignCoupon(self, couponId: str, winnerId: int):
        coupon = self.couponsDatabase.getCouponById(couponId)

        if coupon is None:
            raise ValueError("Coupon not found")
        if coupon.assigned:
            raise ValueError("Coupon already assigned")

        coupon.assigned = True
        coupon.winnerId = winnerId
       
        self.assignedCouponDatabase.addCoupon(coupon)

        self.couponRedemptionAdapter.redeem(couponId)
        self.customerMessagingProcessor.sendWinnerCoupon(couponId, winnerId)

        return coupon

    def getCoupon(self, storeId: int, gamerId: str):
        coupon = self.assignedCouponDatabase.getCoupon(storeId, gamerId)

        if coupon is None:
            raise ValueError("Coupon not found")
        
        return coupon
    
    def destroyCoupon(self, couponId: str):
        self.assignedCouponDatabase.deleteCoupon(couponId)
        