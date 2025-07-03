from CouponService.src.models.Offer import Offer
from commons.adapters.DatabaseAdapter import DatabaseAdapter
from commons.adapters.SupabaseDatabaseAdapter import SupabaseDatabaseAdapter
from commons.enums.DatabaseType import DatabaseType
from CouponService.src.enums.OfferType import OfferType
from pydantic import BaseModel
from typing import List, Optional

class OfferData(BaseModel):
    id: Optional[int] = None
    storeId: int
    offerType: str
    value: Optional[str] = None
    count: int
    productId: int
    expirationDate: str
    isActive: bool = True
    createdAt: Optional[str] = None

class OffersDatabase(DatabaseAdapter):

    def __init__(self, supabaseDatabaseAdapter: SupabaseDatabaseAdapter):
        self.database = DatabaseType.COUPONS
        self.supabaseDatabase = supabaseDatabaseAdapter
        
        # Mapping from camelCase (backend) to snake_case (database)
        self.field_mapping = {
            'storeId': 'store_id',
            'offerType': 'offer_type', 
            'productId': 'product_id',
            'expirationDate': 'expiration_date',
            'isActive': 'is_active',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at'
        }
        
        # Reverse mapping for converting database results back to camelCase
        self.reverse_field_mapping = {v: k for k, v in self.field_mapping.items()}
    
    def _convert_to_snake_case(self, data: dict) -> dict:
        """Convert camelCase keys to snake_case for database operations"""
        converted = {}
        for key, value in data.items():
            db_key = self.field_mapping.get(key, key)
            converted[db_key] = value
        return converted
    
    def _convert_from_snake_case(self, data: dict) -> dict:
        """Convert snake_case keys from database to camelCase for backend"""
        converted = {}
        for key, value in data.items():
            backend_key = self.reverse_field_mapping.get(key, key)
            converted[backend_key] = value
        return converted

    def createOffer(self, offer_data: OfferData) -> OfferData:
        """Create a new offer in the database"""
        offer_dict = offer_data.model_dump(exclude={'id'})
        
        # Set value to None for bogo and free offers
        if offer_data.offerType in ['bogo', 'free']:
            offer_dict['value'] = None
            
        # Convert to snake_case for database
        db_dict = self._convert_to_snake_case(offer_dict)
        response = self.supabaseDatabase.insertData("couponOffers", db_dict)
        
        if response.data:
            # Convert response back to camelCase
            camel_data = self._convert_from_snake_case(response.data[0])
            return OfferData.model_validate(camel_data)
        else:
            raise Exception("Failed to create offer")

    def getOffersByStore(self, storeId: int) -> List[OfferData]:
        """Get all offers for a specific store"""
        # Convert filter keys to snake_case
        filters = self._convert_to_snake_case({"storeId": storeId, "isActive": True})
        response = self.supabaseDatabase.queryTable(
            table="couponOffers",
            filters=filters
        )
        
        if response.data:
            # Convert each result back to camelCase
            camel_offers = [self._convert_from_snake_case(offer) for offer in response.data]
            return [OfferData.model_validate(offer) for offer in camel_offers]
        return []

    def getOfferById(self, offerId: int) -> Optional[OfferData]:
        """Get a specific offer by ID"""
        response = self.supabaseDatabase.queryTable(
            table="couponOffers",
            filters={"id": offerId}
        )
        
        if response.data:
            # Convert response back to camelCase
            camel_data = self._convert_from_snake_case(response.data[0])
            return OfferData.model_validate(camel_data)
        return None

    # def updateOffer(self, offerId: int, offer_data: OfferData) -> OfferData:
    #     """Update an existing offer"""
    #     offer_dict = offer_data.model_dump(exclude={'id'})
        
    #     # Set value to None for bogo and free offers
    #     if offer_data.offerType in ['bogo', 'free']:
    #         offer_dict['value'] = None
            
    #     # Convert to snake_case for database
    #     db_dict = self._convert_to_snake_case(offer_dict)
    #     response = self.supabaseDatabase.updateTable("couponOffers", "id", offerId, db_dict)
        
    #     if response.data:
    #         # Convert response back to camelCase
    #         camel_data = self._convert_from_snake_case(response.data[0])
    #         return OfferData.model_validate(camel_data)
    #     else:
    #         raise Exception("Failed to update offer")

    def updateOffer(self, offerId: int, offer_data: OfferData) -> OfferData:
        """Update an existing offer"""
        offer_dict = offer_data.model_dump(exclude={'id'})

        if offer_data.offerType in ['bogo', 'free']:
            offer_dict['value'] = None

        db_dict = self._convert_to_snake_case(offer_dict)
        
        print(f"Updating offer id={offerId} with data: {db_dict}")

        response = self.supabaseDatabase.updateTable("couponOffers", "id", offerId, db_dict)

        print(f"Supabase update response: {response}")

        if response.data:
            camel_data = self._convert_from_snake_case(response.data[0])
            print(f"Updated offer data returned: {camel_data}")
            return OfferData.model_validate(camel_data)
        else:
            print(f"Update failed, response error: {getattr(response, 'error', None)}")
            raise Exception("Failed to update offer")

    def deleteOffer(self, offerId: int) -> bool:
        """Soft delete an offer by setting isActive to false"""
        try:
            # Convert field name to snake_case
            update_data = self._convert_to_snake_case({"isActive": False})
            response = self.supabaseDatabase.updateTable("couponOffers", "id", offerId, update_data)
            if response.error:
                return False
            return True
        except Exception as e:
            print("Exception during update:", e)
            return False

    def getActiveOffers(self, storeId: int, gameId: int) -> List[Offer]:
        """Get active offers for coupon generation (maintains compatibility with existing system)"""
        offer_data = self.getOffersByStore(storeId)
        
        # Convert OfferData to Offer objects for compatibility
        offers = []
        for data in offer_data:
            if data.isActive:
                offer = Offer(
                    offerType=OfferType(data.offerType),
                    value=data.value,
                    count=data.count,
                    productId=data.productId,
                    expirationDate=data.expirationDate
                )
                offers.append(offer)
        
        return offers