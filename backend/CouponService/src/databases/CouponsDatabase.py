from CouponService.src.databases.Coupon import Coupon
from commons.adapters import SupabaseDatabaseAdapter
from commons.enums.DatabaseType import DatabaseType
from pydantic import BaseModel
from commons.adapters.DatabaseAdapter import DatabaseAdapter
from commons.adapters.SupabaseDatabaseAdapter import SupabaseDatabaseAdapter

class CouponsDatabase(DatabaseAdapter):

    def __init__(self, supabaseDatabaseAdapter: SupabaseDatabaseAdapter):
        self.database = DatabaseType.COUPONS
        self.supabaseDatabase = supabaseDatabaseAdapter

    def getCouponById(self, couponId: str) -> Coupon:
        response = self.supabaseDatabase.queryTable(
            table="coupons",
            filters={"couponId": couponId}
        )
        if response.data:
            return Coupon.model_validate(response.data[0])
        else:
            return None 

    def addCoupon(self, data: Coupon):
        coupon_dict = data.model_dump()
        self.supabaseDatabase.insertData("coupons", coupon_dict)

    def assignWinner(self, couponId: str, winnerId: str):
        data = {"winnerId": winnerId, "assigned": True}
        response = self.supabaseDatabase.updateTable("coupons", "couponId", couponId, data)
        return response
    
    def getGamerCoupons(self, storeId: int, gamerId: str):
        response = self.supabaseDatabase.queryTable(
            table="coupons",
            filters={"storeId": storeId, "winnerId": gamerId}, 
        )

        if response.data:
            return response.data 
        else:
            return []
        
    # Returns True if successfully deleted, False if not
    def destroyCoupon(self, couponId: str) -> bool:
        try:
            self.supabaseDatabase.deleteData("coupons", "couponId", couponId)
            return True
        except:
            return False

    # Get expired coupons for manual cleanup or testing
    def getExpiredCoupons(self):
        """
        Retrieve all expired coupons.
        Note: This uses raw SQL due to date comparison complexity with string dates.
        """
        try:
            # Execute raw SQL query for expired coupons
            response = self.supabaseDatabase.supabaseClient.rpc(
                'get_expired_coupons'
            ).execute()
            
            if response.data:
                return [Coupon.model_validate(coupon) for coupon in response.data]
            return []
        except Exception as e:
            print(f"Error fetching expired coupons: {e}")
            return []

    # Manual cleanup method for testing or emergency use
    def cleanupExpiredCoupons(self) -> int:
        """
        Manually trigger cleanup of expired coupons.
        Returns number of deleted coupons.
        """
        try:
            # Call the cleanup function
            response = self.supabaseDatabase.supabaseClient.rpc(
                'cleanup_expired_coupons'
            ).execute()
            
            if response.data:
                return response.data
            return 0
        except Exception as e:
            print(f"Error during manual cleanup: {e}")
            return 0

    # Get cleanup statistics
    def getCleanupStats(self):
        """
        Get coupon cleanup statistics from the log.
        """
        try:
            response = self.supabaseDatabase.queryTable(
                table="coupon_cleanup_stats",
                columns="*"
            )
            return response.data if response.data else []
        except Exception as e:
            print(f"Error fetching cleanup stats: {e}")
            return []
      