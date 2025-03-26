from .adapters.StripeAdapter import StripeAdapter
from .enums.Database import Database

stripeAdapter = StripeAdapter()

class PaymentService:
    def __init__(self):
        self.clientsDb: str = Database.clients.value
        self.membershipDb: str = Database.membership.value
        self.offersDb: str = Database.offers.value

    def createAccount(self, auth0ID):
        """ Use Auth0 user ID to create a new Stripe Customer """
        
        # Create Stripe customer
        stripeCustomer = stripeAdapter.createCustomer(user)

        # store Auth0 id and Stripe customer id

        return f'New customer ID: {stripeCustomer.id}'
    
    def addPaymentMethod(self, customerId: str, paymentId: str, defaultMethod: bool):
        """ Attach a Stripe Payment Method to a Stripe Customer """
        try:
            return stripeAdapter.createSetupIntent(paymentId, customerId, defaultMethod)
        except Exception as e:
            print(f"Unexpected Error: {str(e)}")
            return False