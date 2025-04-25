import stripe
from commons.adapters.StripeAdapter import StripeAdapter
from commons.adapters.SupabaseDatabaseAdapter import SupabaseDatabaseAdapter
from commons.enums.PaymentServiceTableNames import PaymentServiceTableNames
from commons.models.ActionResponse import ActionResponse
from commons.models.PaymentMethodRequest import PaymentMethodRequest
from commons.models.PaymentServiceUserPayload import PaymentServiceUserPayload
from commons.models.StripeCustomer import StripeCustomer

class PaymentService:
    clientTableName = PaymentServiceTableNames.CLIENTS.value
    membershipTableName = PaymentServiceTableNames.MEMBERSHIP.value
    offersTableName = PaymentServiceTableNames.OFFERS.value
    supabaseDatabaseAdapter = SupabaseDatabaseAdapter()

    def __init__(self):
        self.stripeAdapter = StripeAdapter()
    
    def addPaymentMethod(self, paymentMethodRequest: PaymentMethodRequest) -> ActionResponse:
        """ Attach a Stripe Payment Method to a Stripe Customer """
        try:
            result = self.stripeAdapter.createSetupIntent(paymentMethodRequest)

            return ActionResponse(
                success=True,
                message="Payment method added",
                data=result)
        except Exception as e:
            print(f"Unexpected Error: {str(e)}")
            return ActionResponse(
                success=False,
                message="An unexpected error has occurred",
                data=None,
                error=e)
        
    def  handleUserLogin(self, userPayload: PaymentServiceUserPayload) -> ActionResponse:
        """ This endpoint ensures that newly authenticated users are stored in the database and that they are designated a Stripe Customer ID """
        name = userPayload.name
        email = userPayload.email
        phone = userPayload.phone
        auth0Id = userPayload.auth0Id

        # get user from client database
        queryResponse = self.supabaseDatabaseAdapter.queryTable(
                self.clientTableName,
                {"auth0ID": auth0Id,},
            )
        
        # if user does not exist, insert new client into client db
        if (not queryResponse.data):
            self.supabaseDatabaseAdapter.insertData(
                    self.clientTableName,
                    { "auth0ID": auth0Id }
            )

        # check if user has stripe account
        queryResponse = self.supabaseDatabaseAdapter.queryTable(
            self.clientTableName,
            {"auth0ID": auth0Id},
            "stripeCustomerID"
        )

        stripeCustomerId = queryResponse.data[0]["stripeCustomerID"]
        
        # if not, generate a new customer obj, then link customer id to client id
        if (not stripeCustomerId):
            stripeCustomerDetails = StripeCustomer(
                name=name,
                phone=phone,
                email=email)
            stripeCustomerObj = self.stripeAdapter.createCustomer(stripeCustomerDetails)
            apiResponse = self.supabaseDatabaseAdapter.updateTable(
                self.clientTableName,
                "auth0ID",
                auth0Id,
                {"stripeCustomerID": stripeCustomerObj.id}
            )

            return ActionResponse(success=True, message="New customer generated", data=str(apiResponse.data))
        
        return ActionResponse(success=True, message="Existing user")
    
    def getMembershipTiers(self) -> ActionResponse:
        tiers = self.supabaseDatabaseAdapter.queryTable(self.membershipTableName)

        return ActionResponse(success=True, message="Membership tiers successfully retrieved", data = str(tiers.data))
    
    def getUserMembershipTier(self, auth0ID) -> ActionResponse:
        try:
            response = self.supabaseDatabaseAdapter.queryTable(
                    self.clientTableName,
                    {
                        "auth0ID": auth0ID
                    },
                    "membershipTier"
                )

            return response
        except Exception as e: return ActionResponse(success=False, message="Unable to retrieve user membership tier")