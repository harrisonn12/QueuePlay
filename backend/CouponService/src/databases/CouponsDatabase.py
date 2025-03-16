from CouponService.src.databases.Coupon import Coupon
from commons.enums.DatabaseType import DatabaseType
from pydantic import BaseModel, ValidationError
from commons import DatabaseAdapter
from commons.adapters.GoogleSheetDatabaseAdapter import GoogleSheetDatabaseAdapter

class CouponsDatabase(DatabaseAdapter):

    def __init__(self, googleSheetDatabaseAdapter: GoogleSheetDatabaseAdapter):
        self.database = DatabaseType.COUPONS
        self.googleSheetDatabaseAdapter = googleSheetDatabaseAdapter

    def getCouponById(self, couponId: str) -> Coupon:
        values = self.googleSheetDatabaseAdapter.get(DatabaseType.COUPONS)  
        for row in values:
            if row[0] == couponId:  
                try:
                    coupon = Coupon(
                        couponId=str(row[0]),
                        storeId=int(row[1]),
                        gameId=int(row[2]),
                        winnerId=str(row[3]),
                        type=str(row[4]),
                        value=str(row[5]),
                        productId=int(row[6]),
                        assigned=bool(row[7]),
                        createdAt=float(row[8]),
                        expirationDate=str(row[9])
                    )
                    return coupon 
                except ValidationError as e:
                    return {"error": f"Invalid data format: {e}"}
        return None  

    def addCoupon(self, data: BaseModel):
        self.googleSheetDatabaseAdapter.post(DatabaseType.COUPONS, data)
    