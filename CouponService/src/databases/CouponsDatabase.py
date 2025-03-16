from backend.commons.enums.DatabaseType import DatabaseType
from pydantic import BaseModel
from backend.commons import DatabaseAdapter
from backend.commons.GoogleSheetDatabaseAdapter import GoogleSheetDatabaseAdapter

class CouponsDatabase(DatabaseAdapter):

    def __init__(self, googleSheetDatabaseAdapter: GoogleSheetDatabaseAdapter):
        self.database = DatabaseType.COUPONS
        self.googleSheetDatabaseAdapter = googleSheetDatabaseAdapter

    def post(self, data: BaseModel):
        self.googleSheetDatabaseAdapter.post(DatabaseType.COUPONS, data)
    
