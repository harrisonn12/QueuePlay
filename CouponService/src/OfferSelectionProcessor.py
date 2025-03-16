import random

class OfferSelectionProcessor:

    def __init__(self) -> None:
        pass
        
    def pick(self, availableOffers):
        weightedOffers = [(offer, offer.count) for offer in availableOffers]
        chosenOffer = random.choices([c[0] for c in weightedOffers], weights=[c[1] for c in weightedOffers])[0]
        return chosenOffer