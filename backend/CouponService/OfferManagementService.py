from CouponService.src.databases.OffersDatabase import OffersDatabase, OfferData
from CouponService.src.enums.OfferType import OfferType
from datetime import datetime, timezone
from typing import List, Optional

class OfferManagementService:
    
    def __init__(self, offersDatabase: OffersDatabase):
        self.offersDatabase = offersDatabase

    def createOffer(self, storeId: int, offerType: str, value: str, count: int, 
                   productId: int, expirationDate: str) -> OfferData:
        """
        Create a new offer for a store
        
        Args:
            storeId: Store identifier
            offerType: Type of offer (BOGO, DISCOUNT, FREE)
            value: Offer value description (e.g., "20% OFF", "BOGO")
            count: Weighted count for selection probability
            productId: Product this offer applies to
            expirationDate: When the offer expires (ISO format)
        
        Returns:
            Created OfferData object
        """

        # Validate offer type
        if offerType not in [e.value for e in OfferType]:
            raise ValueError(f"Invalid offer type: {offerType}")
        
        # Validate expiration date
        try:
            exp_date = datetime.fromisoformat(expirationDate.replace('Z', '+00:00'))
            if exp_date <= datetime.now(timezone.utc):
                raise ValueError("Expiration date must be in the future")
        except ValueError as e:
            raise ValueError(f"Invalid expiration date format: {e}")

        offer_data = OfferData(
            storeId=storeId,
            offerType=offerType,
            value=value,
            count=count,
            productId=productId,
            expirationDate=expirationDate,
            isActive=True,
            createdAt=datetime.now(timezone.utc).isoformat()
        )

        return self.offersDatabase.createOffer(offer_data)

    def getStoreOffers(self, storeId: int) -> List[OfferData]:
        """Get all active offers for a store"""
        return self.offersDatabase.getOffersByStore(storeId)

    def updateOffer(self, offerId: int, storeId: int, offerType: str, value: str, 
                   count: int, productId: int, expirationDate: str) -> OfferData:
        """Update an existing offer"""
        # Validate offer type
        if offerType not in [e.value for e in OfferType]:
            raise ValueError(f"Invalid offer type: {offerType}")

        # Validate expiration date
        try:
            exp_date = datetime.fromisoformat(expirationDate.replace('Z', '+00:00'))
            if exp_date <= datetime.now(timezone.utc):
                raise ValueError("Expiration date must be in the future")
        except ValueError as e:
            raise ValueError(f"Invalid expiration date format: {e}")

        # Verify offer exists and belongs to store
        existing_offer = self.offersDatabase.getOfferById(offerId)
        if not existing_offer:
            raise ValueError("Offer not found")
        if existing_offer.storeId != storeId:
            raise ValueError("Offer does not belong to this store")

        updated_data = OfferData(
            id=offerId,
            storeId=storeId,
            offerType=offerType,
            value=value,
            count=count,
            productId=productId,
            expirationDate=expirationDate,
            isActive=True
        )

        return self.offersDatabase.updateOffer(offerId, updated_data)

    def deleteOffer(self, offerId: int, storeId: int) -> bool:
        """Soft delete an offer (set isActive to false)"""
        # Verify offer exists and belongs to store
        existing_offer = self.offersDatabase.getOfferById(offerId)
        if not existing_offer:
            raise ValueError("Offer not found")
        if existing_offer.storeId != storeId:
            raise ValueError("Offer does not belong to this store")
        
        return self.offersDatabase.deleteOffer(offerId)

    def getOfferById(self, offerId: int) -> Optional[OfferData]:
        """Get a specific offer by ID"""
        return self.offersDatabase.getOfferById(offerId)

    def validateOfferData(self, offerType: str, value: str, count: int, 
                         productId: int, expirationDate: str) -> dict:
        """
        Validate offer data and return validation results
        
        Returns:
            Dictionary with 'valid' boolean and 'errors' list
        """
        errors = []
        
        # Validate offer type
        if offerType not in [e.value for e in OfferType]:
            errors.append(f"Invalid offer type. Must be one of: {[e.value for e in OfferType]}")
        
        # Validate value
        if offerType == OfferType.DISCOUNT:
            if value or len(value.strip()) == 0:
                errors.append("Offer value cannot be empty")
            elif len(value) > 100:
                errors.append("Offer value must be 100 characters or less")
        
        # Validate count
        if count <= 0:
            errors.append("Count must be greater than 0")
        elif count > 10000:
            errors.append("Count must be 10,000 or less")
        
        # Validate product ID
        if productId <= 0:
            errors.append("Product ID must be greater than 0")
        
        # Validate expiration date
        try:
            exp_date = datetime.fromisoformat(expirationDate.replace('Z', '+00:00'))
            if exp_date <= datetime.now(timezone.utc):
                errors.append("Expiration date must be in the future")
        except (ValueError, TypeError):
            errors.append("Invalid expiration date format. Use ISO format (YYYY-MM-DDTHH:MM:SSZ)")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }