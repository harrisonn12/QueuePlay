from backend.commons.enums.DatabaseType import DatabaseType
from pydantic import BaseModel
from backend.commons import DatabaseAdapter
from backend.commons.GoogleSheetDatabaseAdapter import GoogleSheetDatabaseAdapter

class CouponsDatabase(DatabaseAdapter):

    def __init__(self, googleSheetDatabaseAdapter: GoogleSheetDatabaseAdapter):
        self.database = DatabaseType.COUPONS
        self.googleSheetDatabaseAdapter = googleSheetDatabaseAdapter

    def get_coupon_by_id(self, database: DatabaseType, coupon_id: str):
        values = self.get(database)  # Retrieve all rows
        for row in values:
            if row[0] == coupon_id:  # Assuming coupon_id is in the first column (A)
                return row
        return None  

    def post(self, data: BaseModel):
        self.googleSheetDatabaseAdapter.post(DatabaseType.COUPONS, data)
    
