from commons.adapters.StripeAdapter import StripeAdapter
from commons.models.PaymentMethodRequest import PaymentMethodRequest


class PaymentService:
    clientsDbName = 'clients'
    membershipDbName = 'membership'
    offersDbName = 'offers'

    def __init__(self):
        self.stripeAdapter = StripeAdapter()

    def createAccount(self, auth0ID: str):
        """ Use Auth0 user ID to create a new Stripe Customer """

        # Create Stripe customer
        stripeCustomer = self.stripeAdapter.createCustomer(user)

        # store Auth0 id and Stripe customer id

        return f'New customer ID: {stripeCustomer.id}'

    def addPaymentMethod(self, paymentMethodRequest: PaymentMethodRequest):
        """ Attach a Stripe Payment Method to a Stripe Customer """
        try:
            return self.stripeAdapter.createSetupIntent(paymentMethodRequest)
        except Exception as e:
            print(f"Unexpected Error: {str(e)}")
            return False

    def userLogin(self, auth0Id):
        # user has auth0Id in database
        #   check if they have a Stripe account
        #       if not, then create one and pair it with auth0Id
        pass
