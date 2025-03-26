import os
from ..enums.Database import Database
from supabase import create_client, Client


class DatabaseAdapter():
    def __init__(self):
        self.url: str = os.environ.get("SUPABASE_URL")
        self.key: str = os.environ.get("SUPABASE_KEY")
        self.supabase: Client = create_client(self.url, self.key)

    def firstFetch(self, table = Database.clients.value):
        return self.supabase.table(table).select("*").execute()