import os
from supabase import create_client, Client


class SupabaseDatabaseAdapter():
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_KEY")
    supabase: Client = create_client(url, key)
    email: str = os.environ.get("SUPABASE_USERNAME")
    password: str = os.environ.get("SUPABASE_PASSWORD")
        
    supabase.auth.sign_in_with_password({
        "email": email,
        "password": password,
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