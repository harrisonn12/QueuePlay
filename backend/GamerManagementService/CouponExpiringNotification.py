from GamerManagementService.builders import NotificationBuilder

class CouponExpiringNotification(NotificationBuilder):
    def buildMessage(self, coupons) -> str:

        message_lines = ["⏰ Your coupons are expiring soon!"]
        for coupon in coupons:
            message_lines.append(
                f"- {coupon.productId} (ID: {coupon.id}) expires {coupon.expirationDate.strftime('%Y-%m-%d')}"
            )

        return "\n".join(message_lines)