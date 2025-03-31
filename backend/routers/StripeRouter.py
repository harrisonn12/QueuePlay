from fastapi import APIRouter
from commons.adapters.StripeAdapter import StripeAdapter
from commons.models.CreditCardDetails import CreditCardDetails


router = APIRouter(
    prefix="/payments",
    tags=["Payment Service: Stripe Adapter"],
    responses={404: {"description": "Not found"}}
)

stripeAdapter = StripeAdapter()

@router.get("/listAll")
def listPaymentMethod(customerId: str):
    """ Display all Payment Methods """
    return stripeAdapter.listPaymentMethods(customerId)

@router.put("/createPaymentIntent")
def createPaymentIntent(customerId, paymentMethodId, charge):
    return stripeAdapter.createPaymentIntent(customerId, paymentMethodId, charge)

@router.post("/createPaymentMethod")
def createPaymentMethod(
    cardNumber: str,
    expMonth: str,
    expYear: str,
    cvc: str):
    """ Generate a Payment Method """

    cardDetails = CreditCardDetails(cardNumber, expMonth, expYear, cvc)

    return stripeAdapter.createPaymentMethod(cardDetails)

@router.delete("/deletePaymentMethod")
def deletePaymentMethod(paymentMethodId):
    """ Detaches a Payment Method from Customer; Not Retachable """
    return stripeAdapter.detachPaymentMethod(paymentMethodId)

@router.delete("/deleteAllPaymentMethods")
def deleteAllPaymentMethods(customerId):
    """ Detaches all Payment Methods attached to a Customer """
    return stripeAdapter.detachAllPaymentMethods(customerId)
