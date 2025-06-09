from GamerManagementService.builders.NotificationBuilder import NotificationBuilder

class CouponWinNotification(NotificationBuilder):
    def buildMessage(self, coupon) -> str:
        return (
            f"🎉 Congratulations! You've won a coupon!\n"
            f"Coupon ID: {coupon.couponId}\n"
            f"ProductType: {coupon.productId}\n"
            f"Value: {coupon.value}\n"
            f"Expires on: {coupon.expirationDate.strftime('%Y-%m-%d')}"
        )