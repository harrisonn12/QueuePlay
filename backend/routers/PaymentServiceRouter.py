from fastapi import APIRouter
from PaymentService.PaymentService import PaymentService
from commons.adapters.SupabaseDatabaseAdapter import SupabaseDatabaseAdapter
from commons.enums.PaymentServiceTableNames import PaymentServiceTableNames

router = APIRouter(
    prefix="/paymentdb",
    tags=["Payment Service"],
    responses={404: {"description": "Not found"}}
)

paymentService = PaymentService()
supabaseDatabaseAdapter = SupabaseDatabaseAdapter()
clientTableName = PaymentServiceTableNames.CLIENTS.value



@router.post("/handleUserLogin")
def handleUserLogin(auth0Id: str):
    # check if user exists in client database
    queryResponse = supabaseDatabaseAdapter.queryTable(
            clientTableName,
            {
                "auth0_id": auth0Id,
            },
        )

    # if user does not exist, insert new client into client db
    if (not queryResponse.data):
        return supabaseDatabaseAdapter.insertData(
                clientTableName,
                { "auth0_id": auth0Id }
            )

    # check if user has stripe account
    # if not, generate a new customer obj, then link customer id to client id
    pass

@router.post("/createNewUser")
def createNewUser(name: str, email: str):
    """ Generate a new user account """
    return paymentService.createAccount(name, email)

@router.post("/addPaymentMethod")
def addPaymentMethod(customerId: str, paymentId: str, defaultMethod: bool):
    """ Attach Payment Method to a Customer"""
    return paymentService.addPaymentMethod(customerId, paymentId, defaultMethod)