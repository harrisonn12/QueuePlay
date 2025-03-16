from pydantic import BaseModel
from backend.commons.enums.DatabaseType import DatabaseType


class DatabaseAdapter:

    def get(self, databaseType: DatabaseType):
        pass

    def post(self, databaseType: DatabaseType, data: BaseModel):
        pass
