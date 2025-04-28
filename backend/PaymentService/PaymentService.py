import stripe
from commons.adapters.StripeAdapter import StripeAdapter
from commons.adapters.SupabaseDatabaseAdapter import SupabaseDatabaseAdapter
from commons.enums.PaymentServiceTableNames import PaymentServiceTableNames
from commons.models.endpointResponses.ActionResponse import ActionResponse
from commons.models.endpointResponses.HandleUserLoginResponse import HandleUserLoginResponse
from commons.models.endpointResponses.GetMembershipTiersResponse import GetMembershipTiersResponse
from commons.models.endpointResponses.GetUserMembershipTierResponse import GetUserMembershipTierResponse
from commons.models.PaymentServiceUserPayload import PaymentServiceUserPayload
from commons.models.StripeCustomer import StripeCustomer

class PaymentService:
    CLIENT_TABLE_NAME = PaymentServiceTableNames.CLIENTS.value
    MEMBERSHIP_TABLE_NAME = PaymentServiceTableNames.MEMBERSHIP.value
    OFFERS_TABLE_NAME = PaymentServiceTableNames.OFFERS.value

    def __init__(self):
        self.stripeAdapter = StripeAdapter()
        self.supabaseDatabaseAdapter = SupabaseDatabaseAdapter()
        
    def  handleUserLogin(self, userPayload: PaymentServiceUserPayload) -> HandleUserLoginResponse:
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
            return HandleUserLoginResponse(
                error=e,
                message="Failed to get user from the client database")
        
        # if user does not exist, insert new client into client db
        try:
            if (not queryResponse.data):
                self.supabaseDatabaseAdapter.insertData(
                        self.CLIENT_TABLE_NAME,
                        { "auth0ID": auth0Id }
                )
            
        except Exception as e:
            return HandleUserLoginResponse(
                error=e,
                message="Failed to insert new client into Client database")

        # check if user has stripe account
        try:
            queryResponse = self.supabaseDatabaseAdapter.queryTable(
                self.CLIENT_TABLE_NAME,
                {"auth0ID": auth0Id},
                "stripeCustomerID"
            )
        except Exception as e:
            return HandleUserLoginResponse(
                error=e,
                message="Failed to check for client Stripe account")

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
                return HandleUserLoginResponse(
                error=e,
                message="Failed to generate new customer object")
            
            try:
                self.supabaseDatabaseAdapter.updateTable(
                    self.CLIENT_TABLE_NAME,
                    "auth0ID",
                    auth0Id,
                    {"stripeCustomerID": stripeCustomerObj.id}
                )
            except Exception as e:
                return HandleUserLoginResponse(
                error=e,
                message="Failed to update Client table")

            return HandleUserLoginResponse(message="New successfully generated.")

        return HandleUserLoginResponse(message="Existing user has sucessfully logged in.")
    
    def getMembershipTiers(self) -> GetMembershipTiersResponse:
        try:
            tiers = self.supabaseDatabaseAdapter.queryTable(self.MEMBERSHIP_TABLE_NAME)
            
            return GetMembershipTiersResponse(tiers=tiers.data, message="Membership tiers successfully retrieved.")
        except Exception as e:
            return GetMembershipTiersResponse(error=e, message="Unable to retrieve membership tiers.")
    
    def getUserMembershipTier(self, auth0ID: str) -> GetUserMembershipTierResponse:
        try:
            response = self.supabaseDatabaseAdapter.queryTable(
                    self.CLIENT_TABLE_NAME,
                    {
                        "auth0ID": auth0ID
                    },
                    "membershipTier"
                )

            return GetUserMembershipTierResponse(
                tier=response.data[0]['membershipTier'],
                message="User membership tier retrieved successfully")
        except Exception as e:
            return GetMembershipTiersResponse(error=e, message="Unable to retrieve user membership tier")