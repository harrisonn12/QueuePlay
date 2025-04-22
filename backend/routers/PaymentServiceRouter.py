from fastapi import APIRouter
from PaymentService.PaymentService import PaymentService
from commons.models.PaymentServiceUserPayload import PaymentServiceUserPayload

router = APIRouter(
    prefix="/paymentService",
    tags=["Payment Service"],
    responses={404: {"description": "Not found"}}
)

paymentService = PaymentService()

@router.post("/handleUserLogin")
def handleUserLogin(userPayload: PaymentServiceUserPayload):
    return paymentService.handleUserLogin(userPayload)

@router.post("/createNewUser")
def createNewUser(name: str, email: str):
    """ Generate a new user account """
    return paymentService.createAccount(name, email)

@router.post("/addPaymentMethod")
def addPaymentMethod(customerId: str, paymentId: str, defaultMethod: bool):
    """ Attach Payment Method to a Customer"""
    return paymentService.addPaymentMethod(customerId, paymentId, defaultMethod)

@router.get("/getMembershipTiers")
def getMembershipTiers():
    return paymentService.getMembershipTiers()