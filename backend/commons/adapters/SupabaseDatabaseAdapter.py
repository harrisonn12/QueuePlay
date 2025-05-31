import os
from supabase import create_client, Client
from dotenv import load_dotenv


class SupabaseDatabaseAdapter:
    def __init__(self):
        load_dotenv()
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        email = os.environ.get("SUPABASE_USERNAME")
        password = os.environ.get("SUPABASE_PASSWORD")

        if not all([url, key, email, password]):
            raise ValueError("Missing Supabase environment variables.")

        self.supabase: Client = create_client(url, key)
        self.supabase.auth.sign_in_with_password(
            {
                "email": email,
                "password": password,
            }
        )

    def getTable(self, table):
        response = self.supabase.table(table).select("*").execute()

        return response

    def insertData(self, table, data):
        response = self.supabase.table(table).insert(data).execute()
        return response

    def queryTable(self, table: str, filters: dict = None, columns: str = "*"):
        """
        Query a table with optional filters and specific columns.

        :param table: The name of the table to query.
        :param filters: A dictionary of field-value pairs to filter the query. (Ex. filters={"id": 1, "status": "active"})
        :param columns: The columns to select, defaults to all columns ("*").
        :return: The query response.
        """
        query = self.supabase.table(table).select(columns)

        if filters:
            for field, value in filters.items():
                query = query.eq(field, value)

        response = query.execute()
        return response

    def updateTable(self, table: str, fieldFilter: str, valueFilter: str, data: dict):
        """
        Update a table entry using field filter

        :param table: The name of the table to query.
        :param fieldFilter: The name of the column to filter
        :param valueFilter: The value to filter the field with
        :param data: The value to update the filtered fields
        :return: The query response
        """
        response = (
            self.supabase.table(table)
            .update(data)
            .eq(fieldFilter, valueFilter)
            .execute()
        )

        return response

    def deleteData(self, table, field, value):
        response = self.supabase.table(table).delete().eq(field, value).execute()

        return response
