from GamerManagementService.CouponWinNotification import CouponWinNotification
from GamerManagementService.CouponExpiringNotification import CouponExpiringNotification
from commons.enums.NotificationType import NotificationType

class NotificationBuilder:
    
    NOTIFICATION_BUILDERS = {
        NotificationType.COUPON_WIN: CouponWinNotification(),
        NotificationType.COUPON_EXPIRING: CouponExpiringNotification(),
    }