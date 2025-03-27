from CouponService.src.models.Offer import Offer
from CouponService.src.enums.OfferType import OfferType

class AvailableOffersAdapter:
    def __init__(self) -> None:
        pass

    def get(self, storeId: int, gameId: int) -> list:
        offer_1 = Offer(offerType=OfferType.BOGO, value="Free", count=100, productId=1, expirationDate="2025-12-31")
        offer_2 = Offer(offerType=OfferType.DISCOUNT, value="20%", count=50, productId=2, expirationDate="2025-06-30")
        return [offer_1, offer_2]



