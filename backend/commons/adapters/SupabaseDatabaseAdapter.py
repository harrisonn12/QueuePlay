import os
from supabase import create_client, Client
from dotenv import load_dotenv

class SupabaseDatabaseAdapter:

    def __init__(self):
        load_dotenv()
        url: str = os.environ.get("SUPABASE_URL")
        key: str = os.environ.get("SUPABASE_KEY")
        self.email: str = os.environ.get("SUPABASE_USERNAME")
        self.password: str = os.environ.get("SUPABASE_PASSWORD")

        self.supabaseClient = create_client(url, key)

        self.supabaseClient.auth.sign_in_with_password({
            "email": self.email,
            "password": self.password,
        })

    def getTable(self, table):
        response = (
            self.supabaseClient.table(table)
            .select("*")
            .execute()
        )

        return response
    
    def insertData(self, table, data):
        response = self.supabaseClient.table(table).insert(data).execute()
        return response
    
    def queryTable(self, table, filters=None, columns="*"):
        """
        Query a table with optional filters and specific columns.

        :param table: The name of the table to query.
        :param filters: A dictionary of field-value pairs to filter the query.
        :param columns: The columns to select, defaults to all columns ("*").
        :return: The query response.
        """
        query = self.supabaseClient.table(table).select(columns)
        
        if filters:
            for field, value in filters.items():
                query = query.eq(field, value)
        
        response = query.execute()
        return response
    
    def updateTable(self, table, fieldFilter, valueFilter, data):
        response = (
            self.supabaseClient.table(table)
            .update(data)
            .eq(fieldFilter, valueFilter)
            .execute()
        )

        return response

    def deleteData(self, table, field, value):
        response = (
            self.supabaseClient.table(table)
            .delete()
            .eq(field, value)
            .execute()
        )

        return response