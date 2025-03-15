import os
from pydantic import BaseModel
from googleapiclient.discovery import build
from google.oauth2 import service_account
from common.enums.DatabaseType import DatabaseType
from common.serviceadapters.DatabaseAdapter import DatabaseAdapter


class GoogleSheetDatabaseAdapter(DatabaseAdapter):
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    SERVICE_ACCOUNT_FILE = './service_account.json'
    DEFAULT_POST_RANGE = 'Sheet1!A1:D1'
    DEFAULT_GET_RANGE = 'Sheet1!A:D'

    def __init__(self, database:DatabaseType):
        credentials = service_account.Credentials.from_service_account_file(
            self.SERVICE_ACCOUNT_FILE, scopes=self.SCOPES)

        self.sheets_service = build('sheets', 'v4', credentials=credentials)

        self.spreadsheetId = self.__getSpreadSheetId(database)

    def get(self, id: str) -> list:
        result = self.sheets_service.spreadsheets().values().get(
            spreadsheetId=self.spreadsheetId, range=self.DEFAULT_GET_RANGE).execute()
        values = result.get('values', [])
        return values


    def post(self, database: DatabaseType, data: BaseModel):
        body = {
            'values': [data]
        }
        result = self.sheets_service.spreadsheets().values().append(
            spreadsheetId=self.spreadsheetId, range=self.DEFAULT_POST_RANGE,
            valueInputOption='RAW', body=body, insertDataOption="INSERT_ROWS").execute()
        return result

    def __getSpreadSheetId(self, database: DatabaseType):
        match database:
            case DatabaseType.VIDEO_TRANSCRIPT:
                return os.environ['VIDEO_TRANSCRIPT_SPREADSHEET_ID']

            case _:
                raise ValueError("Unsupported DatabaseType")
