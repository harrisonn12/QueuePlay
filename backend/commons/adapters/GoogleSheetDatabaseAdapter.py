import os
from pydantic import BaseModel
from googleapiclient.discovery import build
from google.oauth2 import service_account
from commons.adapters.DatabaseAdapter import DatabaseAdapter
from commons.enums.DatabaseType import DatabaseType


class GoogleSheetDatabaseAdapter(DatabaseAdapter):
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    SERVICE_ACCOUNT_FILE = './service_account.json'
    DEFAULT_POST_RANGE = 'Sheet1!A1:D1'
    DEFAULT_GET_RANGE = 'Sheet1!A:D'

    def __init__(self):
        credentials = service_account.Credentials.from_service_account_file(
            self.SERVICE_ACCOUNT_FILE, scopes=self.SCOPES)

        self.sheets_service = build('sheets', 'v4', credentials=credentials)

    def get(self, database: DatabaseType) -> list:
        spreadsheetId = self.__getSpreadSheetId(database)
        result = self.sheets_service.spreadsheets().values().get(
            spreadsheetId=spreadsheetId, range=self.__getSpreadSheetRange(database)).execute()
        values = result.get('values', [])
        return values

    def post(self, database: DatabaseType, data: BaseModel):
        spreadsheetId = self.__getSpreadSheetId(database)
        body = {
            'values': [data]
        }
        result = self.sheets_service.spreadsheets().values().append(
            spreadsheetId=spreadsheetId, range=self.__getSpreadSheetPostRange(database),
            valueInputOption='RAW', body=body, insertDataOption="INSERT_ROWS").execute()
        return result

    def __getSpreadSheetId(self, database: DatabaseType):
        match database:
            case DatabaseType.COUPONS:
                return "1SbkS8Huqwtg8KbeHkDmCYgQtAmGJuC5UDRd8mYmu2Z4"

            case _:
                raise ValueError("Unsupported DatabaseType")
    
    def __getSpreadSheetPostRange(self, database:DatabaseType):
        match database:
            case DatabaseType.COUPONS:
                return 'Sheet2!A1:J1'

            case _:
                return 'Sheet1!A1:D1'

    
    def __getSpreadSheetRange(self, database: DatabaseType):
        match database:
            case DatabaseType.COUPONS:
                return 'Sheet2!A:J'

            case _:
                return 'Sheet1!A:D'
