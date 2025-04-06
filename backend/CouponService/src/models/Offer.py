from dataclasses import dataclass

from CouponService.src.enums.OfferType import OfferType

@dataclass
class Offer:
    offerType: OfferType
    value: str
    count: int
    productId: int
    expirationDate: str