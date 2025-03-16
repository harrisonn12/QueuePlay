from backend.CouponService.src.databases.Coupon import Coupon
from backend.commons.enums.DatabaseType import DatabaseType
from pydantic import BaseModel, ValidationError
from backend.commons import DatabaseAdapter
from backend.commons.GoogleSheetDatabaseAdapter import GoogleSheetDatabaseAdapter

class CouponsDatabase(DatabaseAdapter):

    def __init__(self, googleSheetDatabaseAdapter: GoogleSheetDatabaseAdapter):
        self.database = DatabaseType.COUPONS
        self.googleSheetDatabaseAdapter = googleSheetDatabaseAdapter

    def getCoupon(self, storeId: int, gamerId: str):
        values = self.googleSheetDatabaseAdapter.get(DatabaseType.COUPONS)  
        for row in values:
            if row[1] == storeId and row[3] == gamerId:  
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

    def deleteCoupon(self, couponId: str):
        pass
    
