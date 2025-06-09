from datetime import datetime, timedelta
from collections import defaultdict

from CouponService.src.databases.Coupon import Coupon
from commons.enums import NotificationType

EXPIRATION_IN_DAYS = 7

class GamerManagementService:

    def __init__(self, gamersDatabase, couponsDatabase):
        self.gamersDatabase = gamersDatabase
        self.couponsDatabase = couponsDatabase

    # Sends a text message to a gamerId.phoneNumber
    def sendSMSByNotificationType(self, gamerId, notificationType: NotificationType) -> bool:
        builder = NotificationBuilder.get(notificationType)

        message = builder.buildMessage()

        gamer = self.gamersDatabase.getGamer(gamerId)
        return self.sendSMS(gamer.phoneNumber, message)

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
