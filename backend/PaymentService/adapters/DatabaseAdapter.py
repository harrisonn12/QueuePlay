import os
from supabase import create_client, Client


class DatabaseAdapter():
    def __init__(self):
        self.url: str = os.environ.get("SUPABASE_URL")
        self.key: str = os.environ.get("SUPABASE_KEY")

        self.supabase: Client = create_client(self.url, self.key)

        self.email: str = os.environ.get("SUPABASE_USER_USERNAME")
        self.password: str = os.environ.get("SUPABASE_USER_PASSWORD")
        
        self.supabase.auth.sign_in_with_password({
            "email": self.email,
            "password": self.password,
        })

    def getTable(self, table):
        response = (
            self.supabase.table(table)
            .select("*")
            .execute()
        )

        return response
    
    def insertData(self, table, data):
        response = self.supabase.table(table).insert(data).execute()
        return response
    
    def updateTable(self, table, fieldFilter, valueFilter, data):
        response = (
            self.supabase.table(table)
            .update(data)
            .eq(fieldFilter, valueFilter)
            .execute()
        )

        return response

    def deleteData(self, table, field, value):
        response = (
            self.supabase.table(table)
            .delete()
            .eq(field, value)
            .execute()
        )

        return response