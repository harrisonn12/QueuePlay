import stripe
from commons.adapters.StripeAdapter import StripeAdapter
from commons.adapters.SupabaseDatabaseAdapter import SupabaseDatabaseAdapter
from commons.enums.PaymentServiceTableNames import PaymentServiceTableNames
from commons.models.ActionResponse import ActionResponse
from commons.models.PaymentMethodRequest import PaymentMethodRequest
from commons.models.PaymentServiceUserPayload import PaymentServiceUserPayload
from commons.models.StripeCustomer import StripeCustomer

class PaymentService:
    CLIENT_TABLE_NAME = PaymentServiceTableNames.CLIENTS.value
    MEMBERSHIP_TABLE_NAME = PaymentServiceTableNames.MEMBERSHIP.value
    OFFERS_TABLE_NAME = PaymentServiceTableNames.OFFERS.value

    def __init__(self):
        self.stripeAdapter = StripeAdapter()
        self.supabaseDatabaseAdapter = SupabaseDatabaseAdapter()
    
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
        try:
            queryResponse = self.supabaseDatabaseAdapter.queryTable(
                    self.CLIENT_TABLE_NAME,
                    {"auth0ID": auth0Id,},
                )
        except Exception as e:
            return ActionResponse(
                success=False,
                message="Failed to get user from the client database",
                error=e)
        
        # if user does not exist, insert new client into client db
        try:
            if (not queryResponse.data):
                self.supabaseDatabaseAdapter.insertData(
                        self.CLIENT_TABLE_NAME,
                        { "auth0ID": auth0Id }
                )
        except Exception as e:
            return ActionResponse(
                success=False,
                message="Failed to insert new client into Client database",
                error=e)

        # check if user has stripe account
        try:
            queryResponse = self.supabaseDatabaseAdapter.queryTable(
                self.CLIENT_TABLE_NAME,
                {"auth0ID": auth0Id},
                "stripeCustomerID"
            )
        except Exception as e:
            return ActionResponse(
                success=False,
                message="Failed to check for client Stripe account",
                error=e)

        stripeCustomerId = queryResponse.data[0]["stripeCustomerID"]
        
        # if not, generate a new customer obj, then link customer id to client id
        if (not stripeCustomerId):
            try:
                stripeCustomerDetails = StripeCustomer(
                    name=name,
                    phone=phone,
                    email=email)
                stripeCustomerObj = self.stripeAdapter.createCustomer(stripeCustomerDetails)
            except Exception as e:
                return ActionResponse(
                    success=False,
                    message="Failed to generate new customer object",
                    error=e)
            
            try:
                apiResponse = self.supabaseDatabaseAdapter.updateTable(
                    self.CLIENT_TABLE_NAME,
                    "auth0ID",
                    auth0Id,
                    {"stripeCustomerID": stripeCustomerObj.id}
                )
            except Exception as e:
                return ActionResponse(
                    success=False,
                    message="Failed to update Client table",
                    error=e)

            return ActionResponse(
                success=True,
                message="New customer generated",
                data=str(apiResponse.data))
        
        return ActionResponse(success=True, message="Existing user")
    
    def getMembershipTiers(self) -> ActionResponse:
        try:
            tiers = self.supabaseDatabaseAdapter.queryTable(self.MEMBERSHIP_TABLE_NAME)
            
            return ActionResponse(
                success=True,
                message="Membership tiers successfully retrieved",
                data = str(tiers.data))
        except Exception as e:
            return ActionResponse(
                success=False,
                message="Unable to retrieve membership tiers",
                error=e)

    
    def getUserMembershipTier(self, auth0ID: str) -> ActionResponse:
        try:
            membershipTier = self.supabaseDatabaseAdapter.queryTable(
                    self.CLIENT_TABLE_NAME,
                    {
                        "auth0ID": auth0ID
                    },
                    "membershipTier"
                )

            return ActionResponse(success=True, message="User membership tier retrieved successfully", data = str(membershipTier.data[0]['membershipTier']))
        except Exception as e:
            return ActionResponse(success=False, message="Unable to retrieve user membership tier", error=e)