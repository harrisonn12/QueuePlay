from CouponService.src.models.Offer import Offer

class AvailableOffersAdapter:
    def __init__(self) -> None:
        pass

    # Dummy class mirroring Daniel's function
    def get(self, storeId: int) -> list:
        offer_1 = Offer(offerType="BOGO", value="Free", count=100, productId=1, expirationDate="2025-12-31")
        offer_2 = Offer(offerType="Discount", value="20%", count=50, productId=2, expirationDate="2025-06-30")
        return [offer_1, offer_2]



