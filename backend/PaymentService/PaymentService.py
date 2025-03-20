from .adapters.StripeAdapter import StripeAdapter

stripeAdapter = StripeAdapter()


class PaymentService:
    def createAccount(self, name, email):
        user = {"name": name, "email": email}

        # Auth0 generate account
            # checks for existing user
            # raise error if user exists
            # cancel everything

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
        
        return True