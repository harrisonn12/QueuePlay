from CouponService.src.databases.Coupon import Coupon
from pydantic import BaseModel, ValidationError
from commons.adapters import GoogleSheetDatabaseAdapter
from commons.enums.DatabaseType import DatabaseType
from commons.adapters.DatabaseAdapter import DatabaseAdapter

class AssignedCouponsDatabase(DatabaseAdapter):

    def __init__(self, googleSheetDatabaseAdapter: GoogleSheetDatabaseAdapter):
        self.database = DatabaseType.COUPONS
        self.googleSheetDatabaseAdapter = googleSheetDatabaseAdapter

    def getCoupon(self, storeId: int, winnerId: str):
        values = self.googleSheetDatabaseAdapter.get(DatabaseType.COUPONS)
        for row in values:
            if int(row[1]) == storeId and row[3] == winnerId:  
                print()
                try:
                    if row[7] == 'TRUE':  
                        assigned = True
                    elif row[7] == 'FALSE':  
                        assigned = False
                    coupon = Coupon(
                        couponId=str(row[0]),
                        storeId=int(row[1]),
                        gameId=int(row[2]),
                        winnerId=str(row[3]),
                        type=str(row[4]),
                        value=str(row[5]),
                        productId=int(row[6]),
                        assigned=assigned,
                        createdAt=float(row[8]),
                        expirationDate=str(row[9])
                    )
                    return coupon  
                except ValidationError as e:
                    return {"error": f"Invalid data format: {e}"}
        return None  

    def addCoupon(self, data: BaseModel):
        coupon_dict = data.model_dump()
        coupon_values = list(coupon_dict.values())
       
        self.googleSheetDatabaseAdapter.post(DatabaseType.COUPONS, coupon_values)

    def deleteCoupon(self, couponId: str):
        pass
        return couponId
    
