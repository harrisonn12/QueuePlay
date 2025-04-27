from datetime import datetime, timedelta
from collections import defaultdict

from CouponService.src.databases.Coupon import Coupon

EXPIRATION_IN_DAYS = 7

class GamerManagementService:

    def __init__(self, gamersDatabase, couponsDatabase):
        self.gamersDatabase = gamersDatabase
        self.couponsDatabase = couponsDatabase

    def sendSMS(self, gamerId, notification):
        pass

    # Returns a dictionary mapping gamers who have expiring coupons to a list of their couponId's where coupons will expire within EXPIRATION_IN_DAYS
    def getGamersWithExpiringCoupons(self) -> dict:
        gamers = self.gamersDatabase.getGamers()
        expiringGamers = defaultdict(list)
        now = datetime.now()

        for gamer in gamers:
            for couponId in gamer.coupons:
                try:
                    coupon = self.couponsDatabase.getCouponById(couponId)
                    exp_date = datetime.fromisoformat(coupon.expirationDate)
                    if exp_date - now <= timedelta(days=EXPIRATION_IN_DAYS):
                        expiringGamers[gamer.gamerId].append(couponId)
                except Exception as e:
                    print(f"Error processing coupon: {coupon}, error: {e}")
        return expiringGamers
