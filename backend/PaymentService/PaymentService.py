from commons.adapters.StripeAdapter import StripeAdapter
from commons.models.UserAccount import UserAccount
from commons.models.requests import AddPaymentMethodRequest, PaymentMethodRequest
from commons.adapters.SupabaseDatabaseAdapter import SupabaseDatabaseAdapter


class PaymentService:
    clientsDbName = 'clients'
    membershipDbName = 'membership'
    offersDbName = 'couponOffers'

    def __init__(self):
        self.stripeAdapter = StripeAdapter()
        self.supabaseAdapter = SupabaseDatabaseAdapter()

    def createAccount(self, user_account: UserAccount):
        """ Use UserAccount model to create a new Stripe Customer and store in database """

        # Create Stripe customer using the user account data
        user_data = {
            'name': user_account.name,
            'email': user_account.email
        }
        stripeCustomer = self.stripeAdapter.createCustomer(user_data)

        # Store the mapping between auth0Id and Stripe customer ID in database
        user_account.stripeCustomerId = stripeCustomer.id

        # Insert the user account into the database
        try:
            user_dict = user_account.model_dump()

            db_dict = {
                'name': user_dict['name'],
                'phone': user_dict['phone'],
                'email': user_dict['email'],
                'auth0_id': user_dict['auth0Id'],
                'stripe_customer_id': user_dict['stripeCustomerId']
            }
            self.supabaseAdapter.insertData("clients", db_dict)
            return f'New customer ID: {stripeCustomer.id} - Account saved to database'
        except Exception as e:
            print(f"Error saving to database: {e}")
            return f'New customer ID: {stripeCustomer.id} - Failed to save to database'

    def addPaymentMethod(self, request: AddPaymentMethodRequest):
        """ Attach a Stripe Payment Method to a Stripe Customer """
        try:
            paymentMethodRequest = PaymentMethodRequest(
                customerId=request.customerId,
                paymentId=request.paymentMethodId,
                defaultPaymentMethod=request.defaultMethod
            )
            return self.stripeAdapter.createSetupIntent(paymentMethodRequest)
        except Exception as e:
            print(f"Unexpected Error: {str(e)}")
            return False

    def userLogin(self, auth0Id):
        # user has auth0Id in database
        #   check if they have a Stripe account
        #       if not, then create one and pair it with auth0Id
        pass
