from commons.adapters.StripeAdapter import StripeAdapter
from commons.adapters.SupabaseDatabaseAdapter import SupabaseDatabaseAdapter
from commons.enums.PaymentServiceTableNames import PaymentServiceTableNames
from commons.models.PaymentMethodRequest import PaymentMethodRequest
from commons.models.PaymentServiceUserPayload import PaymentServiceUserPayload
from commons.models.StripeCustomer import StripeCustomer

class PaymentService:
    clientTableName = PaymentServiceTableNames.CLIENTS.value
    membershipDbName = 'membership'
    offersDbName = 'offers'
    supabaseDatabaseAdapter = SupabaseDatabaseAdapter()

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
        
    def handleUserLogin(self, userPayload: PaymentServiceUserPayload):
        name = userPayload.name
        email = userPayload.email
        phone = userPayload.phone
        auth0Id = userPayload.auth0Id

        # get user from client database
        queryResponse = self.supabaseDatabaseAdapter.queryTable(
                self.clientTableName,
                {
                    "auth0_id": auth0Id,
                },
            )

        # if user does not exist, insert new client into client db
        if (not queryResponse.data):
            self.supabaseDatabaseAdapter.insertData(
                    self.clientTableName,
                    { "auth0_id": auth0Id }
            )

        # check if user has stripe account
        queryResponse = self.supabaseDatabaseAdapter.queryTable(
            self.clientTableName,
            {
                "auth0_id": auth0Id,
            },
            "stripe_customer_id"
        )

        stripeCustomerId = queryResponse.data[0]["stripe_customer_id"]
        
        # if not, generate a new customer obj, then link customer id to client id
        if (not stripeCustomerId):
            stripeCustomerDetails = StripeCustomer(name, phone, email)
            stripeCustomerObj = self.stripeAdapter.createCustomer(stripeCustomerDetails)

            return self.supabaseDatabaseAdapter.updateTable(
                self.clientTableName,
                "auth0_id",
                auth0Id,
                {"stripe_customer_id": stripeCustomerObj.id}
            )
        
        return "no new account"