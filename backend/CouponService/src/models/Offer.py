from CouponService.src.enums.OfferType import OfferType

class Offer:
    offerType: OfferType
    value: str
    count: int
    product_id: int
    expirationDate: str