from fastapi import APIRouter
from PaymentService.PaymentService import PaymentService

router = APIRouter(
    prefix="/paymentdb",
    tags=["Payment Service"],
    responses={404: {"description": "Not found"}}
)

paymentService = PaymentService()

@router.post("/handleUserLogin")
def handleUserLogin(auth0Id: str):
    # check if user exists in client database
    # if not , insert new client into client db

    # check if user has stripe account
    # if not, generate a new customer obj, then link customer id to client id

@router.post("/createNewUser")
def createNewUser(name: str, email: str):
    """ Generate a new user account """
    return paymentService.createAccount(name, email)

@router.post("/addPaymentMethod")
def addPaymentMethod(customerId: str, paymentId: str, defaultMethod: bool):
    """ Attach Payment Method to a Customer"""
    return paymentService.addPaymentMethod(customerId, paymentId, defaultMethod)