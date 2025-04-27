import json
from GamerManagementService.src.databases.Gamer import Gamer
from commons.enums.DatabaseType import DatabaseType
from commons.adapters.DatabaseAdapter import DatabaseAdapter
from commons.adapters.SupabaseDatabaseAdapter import SupabaseDatabaseAdapter

class GamersDatabase(DatabaseAdapter):
    
    def __init__(self, supabaseDatabaseAdapter: SupabaseDatabaseAdapter):
        self.database = DatabaseType.GAMERS
        self.supabaseDatabase = supabaseDatabaseAdapter

    # Adds a gamer to database
    def addGamer(self, data: Gamer) -> bool:
        gamer_dict = data.model_dump()
        gamer_dict["coupons"] = json.dumps(gamer_dict["coupons"])
        try:
            self.supabaseDatabase.insertData("gamers", gamer_dict)
            return True
        except Exception as e:
            print(e)
            return False
    
    # Returns the gamer with gamerId
    def getGamer(self, gamerId: str) -> Gamer:
        response = self.supabaseDatabase.queryTable(
            table="gamers",
            filters={"gamerId": gamerId}
        )

        if response.data:
            data = response.data[0]
            data["coupons"] = json.loads(data["coupons"])
            return Gamer.model_validate(data)
        else:
            return None 
    
    # Returns a list of all gamers
    def getGamers(self) -> list:
        response = self.supabaseDatabase.queryTable(
            table="gamers"
        )
        if response.data:
            cleaned_data = []
            for gamer in response.data:
                if isinstance(gamer.get("coupons"), str):
                    gamer["coupons"] = json.loads(gamer["coupons"])
                cleaned_data.append(Gamer.model_validate(gamer))
            return cleaned_data
        else:
            return []
        
    # Adds couponId to coupons entry
    def addCouponToGamer(self, couponId: str, gamerId: str) -> list:
        coupons = self.getGamer(gamerId).coupons
        coupons.append(couponId)
        data = {"coupons": coupons}
        self.supabaseDatabase.updateTable("gamers", "gamerId", gamerId, data)
        return coupons

    # Removes couponId from coupons entry
    def removeCouponFromGamer(self, couponId: str, gamerId: str) -> list:
        coupons = self.getGamer(gamerId).coupons
        try:
            coupons.remove(couponId)
            data = {"coupons": coupons}
            self.supabaseDatabase.updateTable("gamers", "gamerId", gamerId, data)
        except:
            pass
        return coupons
