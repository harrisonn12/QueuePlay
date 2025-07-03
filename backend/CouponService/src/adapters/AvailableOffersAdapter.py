from CouponService.src.models.Offer import Offer
from CouponService.src.enums.OfferType import OfferType
from CouponService.src.databases.OffersDatabase import OffersDatabase
from typing import Optional

class AvailableOffersAdapter:
    def __init__(self, offersDatabase: Optional[OffersDatabase] = None) -> None:
        self.offersDatabase = offersDatabase

    def get(self, storeId: int, gameId: int) -> list:
        # If database is available, get offers from database
        if self.offersDatabase:
            try:
                return self.offersDatabase.getActiveOffers(storeId, gameId)
            except Exception as e:
                print(f"Error fetching offers from database: {e}")
                # Fallback to hardcoded offers
        
        # Fallback hardcoded offers (backward compatibility)
        offer_1 = Offer(offerType=OfferType.BOGO, value="BOGO", count=100, productId=1, expirationDate="2025-12-31")
        offer_2 = Offer(offerType=OfferType.DISCOUNT, value="20% OFF", count=50, productId=2, expirationDate="2025-06-30")
        return [offer_1, offer_2]
