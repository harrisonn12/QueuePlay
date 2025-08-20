from fastapi import APIRouter
from PaymentService.PaymentService import PaymentService
from commons.models.UserAccount import UserAccount
from commons.models.requests import CreateUserRequest, AddPaymentMethodRequest, CreatePaymentIntentRequest
from commons.models.responses import BaseResponse, UserAccountResponse, PaymentMethodResponse, PaymentIntentResponse

router = APIRouter(
    prefix="/paymentdb",
    tags=["Payment Service"],
    responses={404: {"description": "Not found"}}
)

paymentService = PaymentService()

@router.post("/handleUserLogin")
def handleUserLogin(auth0Id: str):
    pass
    # check if user exists in client database
    # if not , insert new client into client db

    # check if user has stripe account
    # if not, generate a new customer obj, then link customer id to client id

@router.post("/createNewUser", response_model=BaseResponse)
def createNewUser(request: CreateUserRequest):
    """ Generate a new user account using UserAccount model """
    try:
        # Convert request to UserAccount model
        user_account = UserAccount(**request.model_dump())
        result = paymentService.createAccount(user_account)
        
        return BaseResponse(
            success=True,
            message=result,
            data=UserAccountResponse(
                name=user_account.name,
                email=user_account.email,
                phone=user_account.phone,
                auth0Id=user_account.auth0Id,
                stripeCustomerId=user_account.stripeCustomerId
            )
        )
    except Exception as e:
        return BaseResponse(
            success=False,
            message=f"Failed to create user account: {str(e)}"
        )

@router.post("/addPaymentMethod", response_model=BaseResponse)
def addPaymentMethod(request: AddPaymentMethodRequest):
    """ Attach Payment Method to a Customer"""
    try:
        result = paymentService.addPaymentMethod(request)
        return BaseResponse(
            success=True,
            message="Payment method added successfully",
            data=result
        )
    except Exception as e:
        return BaseResponse(
            success=False,
            message=f"Failed to add payment method: {str(e)}"
        )