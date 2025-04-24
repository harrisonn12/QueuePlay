from datetime import datetime, timedelta

from CouponService.src.databases.Coupon import Coupon

EXPIRATION_IN_DAYS = 3

class GamerManagementService:

    def __init__(self, gamersDatabase):
        self.gamersDatabase = gamersDatabase

    def sendSMS(self, gamerId, notification):
        pass

    # Returns a list of gamers who have coupons that will expire within EXPIRATION_IN_DAYS
    def getGamersWithExpiringCoupons(self):
        gamers = self.gamersDatabase.getGamers()
        expiringGamers = []
        now = datetime.now()

        for gamer in gamers:
            for coupon_data in gamer.coupons:
                try:
                    coupon = Coupon(**coupon_data) if isinstance(coupon_data, dict) else coupon_data
                    exp_date = datetime.fromisoformat(coupon.expirationDate)
                    if exp_date - now <= timedelta(days=EXPIRATION_IN_DAYS):
                        expiringGamers.append(gamer)
                        break  
                except Exception as e:
                    print(f"Error processing coupon: {coupon_data}, error: {e}")
        return expiringGamers
