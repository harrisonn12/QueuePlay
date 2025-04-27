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

    def assignWinner(self, couponId: str, winnerId: int):
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
        
    def destroyCoupon(self, couponId: str):
        response = self.supabaseDatabase.deleteData("coupons", "couponId", couponId)
        if response.data:
            return response.data
        else:
            return None
