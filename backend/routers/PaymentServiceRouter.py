from fastapi import APIRouter
from PaymentService.PaymentService import PaymentService
from commons.models.PaymentServiceUserPayload import PaymentServiceUserPayload
from commons.adapters.StripeAdapter import StripeAdapter

router = APIRouter(
    prefix="/paymentService",
    tags=["Payment Service"],
    responses={404: {"description": "Not found"}}
)

paymentService = PaymentService()
stripeAdapter = StripeAdapter()

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

@router.post("/createStripeCustomerPortalSession")
def createStripeCustomerPortalSession(customerID = "cus_S718UIofINdTAG", returnURL = 'http://localhost:5173/'):
    """ Create a portal session for a Customer """
    return stripeAdapter.createCustomerPortalSession(customerID, returnURL)