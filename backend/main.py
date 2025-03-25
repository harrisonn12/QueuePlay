<<<<<<< HEAD
import argparse
from CouponService.src.databases.CouponsDatabase import CouponsDatabase
=======
import argparse, uvicorn
from commons.adapters.ChatGptAdapter import ChatGptAdapter
from configuration.AppConfig import AppConfig
from configuration.AppConfig import Stage
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
>>>>>>> c0b4eea (fix: create routers for FastAPI to clean up main file)
from LobbyService.LobbyService import LobbyService
from LobbyService.src.QRCodeGenerator import QRCodeGenerator
from QuestionService.QuestionService import QuestionService
from QuestionService.src.QuestionAnswerSetGenerator import QuestionAnswerSetGenerator
<<<<<<< HEAD
from commons.adapters.ChatGptAdapter import ChatGptAdapter
from configuration.AppConfig import AppConfig
from configuration.AppConfig import Stage
from CouponService.CouponService import CouponService
from CouponService.src.CouponIdGenerator import CouponIdGenerator
from CouponService.src.OfferSelectionProcessor import OfferSelectionProcessor
from CouponService.src.adapters.AvailableOffersAdapter import AvailableOffersAdapter
from CouponService.src.adapters.CouponRedemptionAdapter import CouponRedemptionAdapter
from CouponService.src.databases import AssignedCouponsDatabase
from CouponService.src.databases.AssignedCouponsDatabase import AssignedCouponsDatabase
from CouponService.src.models.CustomerMessagingProcessor import CustomerMessagingProcessor
from commons.adapters.GoogleSheetDatabaseAdapter import GoogleSheetDatabaseAdapter
from dotenv import load_dotenv
from fastapi import FastAPI
import uvicorn
from PaymentService.PaymentService import PaymentService
from PaymentService.adapters.StripeAdapter import StripeAdapter
from fastapi.middleware.cors import CORSMiddleware
=======
from routers import StripeRouter, PaymentDatabaseRouter, PaymentServiceRouter
>>>>>>> c0b4eea (fix: create routers for FastAPI to clean up main file)


tags_metadata = [
    {"name": "Payment Service", "description": "User accounts, billing, membership, UI"},
    {"name": "Payment Service: Stripe Adapter", "description": "Stripe object actions"},
    {"name": "Payment Service: Supabase", "description": "Database actions"},
]
from pydantic import BaseModel

app = FastAPI(openapi_tags=tags_metadata)
class CreateCouponRequest(BaseModel):
    storeId: int
    gameId: str

class AssignCouponRequest(BaseModel):
    couponId: str
    winnerId: int

class GetCouponRequest(BaseModel):
    storeId: int
    gamerId: str

class DestroyCouponRequest(BaseModel):
    couponId: str

app.include_router(PaymentServiceRouter.router)
app.include_router(PaymentDatabaseRouter.router)
app.include_router(StripeRouter.router)

@app.get("/generateLobbyQRCode")
def generateLobbyQRCode(gameSessionId: str) -> str:
    return lobbyService.generateLobbyQRCode(gameSessionId)

@app.post("/getQuestionAnswerSet")
def getQuestionAnswerSet():
    return questionService.getQuestionAnswerSet(10)

<<<<<<< HEAD
@app.post("/createNewUser", tags=["Payment Service"])
def createNewUser(name: str, email: str):
    """ Generate a new user account """
    return paymentService.createAccount(name, email)

@app.get("/listPaymentMethods", tags=["Payment Service: Stripe Adapter"])
def listPaymentMethod(customerId: str):
    """ Display all Payment Methods """
    return stripeAdapter.listPaymentMethods(customerId)

@app.post("/createIntent")
def setUpPaymentIntent(paymentMethodID):
    return PaymentService.createIntent(paymentMethodID)

@app.post("/createCoupon")
def createCoupon(createCouponRequest: CreateCouponRequest):
    return couponService.createCoupon(createCouponRequest.storeId, createCouponRequest.gameId)

@app.post("/assignCoupon")
def assignCoupon(assignCouponRequest: AssignCouponRequest):
    return couponService.assignCoupon(assignCouponRequest.couponId, assignCouponRequest.winnerId)

@app.delete("/deletePaymentMethod", tags=["Payment Service: Stripe Adapter"])
def deletePaymentMethod(paymentMethodId):
    """ Detaches a Payment Method from Customer; Not Retachable """
    return stripeAdapter.detachPaymentMethod(paymentMethodId)

@app.delete("/deleteAllPaymentMethods", tags=["Payment Service: Stripe Adapter"])
def deleteAllPaymentMethods(customerId):
    """ Detaches all Payment Methods attached to a Customer """
    return stripeAdapter.detachAllPaymentMethods(customerId)
@app.post("/createCoupon")
def createCoupon(createCouponRequest: CreateCouponRequest):
    return couponService.createCoupon(createCouponRequest.storeId, createCouponRequest.gameId)

@app.post("/assignCoupon")
def assignCoupon(assignCouponRequest: AssignCouponRequest):
    return couponService.assignCoupon(assignCouponRequest.couponId, assignCouponRequest.winnerId)

@app.post("/getCoupon")
def getCoupon(getCouponRequest: GetCouponRequest):
    return couponService.getCoupon(getCouponRequest.storeId, getCouponRequest.gameId)

@app.post("/destroyCoupon")
def destroyCoupon(destroyCouponRequest: DestroyCouponRequest):
    return couponService.destroyCoupon(destroyCouponRequest.couponId)

=======
>>>>>>> c0b4eea (fix: create routers for FastAPI to clean up main file)
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Configure environment for the application.')
    parser.add_argument('--env', type=str, choices=['dev', 'prod'], default='dev', help='Select the environment: dev or prod')
    args = parser.parse_args()

    appConfig = AppConfig()

    if args.env == 'prod':
        appConfig.stage = Stage.PROD
        origins = [
            "https://your-production-site.com/",  # Update with your production site
        ]

    else:
        appConfig.stage = Stage.DEVO
        origins = [
            "http://localhost:5173/",
            "http://localhost/",
            "http://localhost:8080/",
        ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=[""],
        allow_headers=[""],
    )
    load_dotenv()
    qrCodeGenerator = QRCodeGenerator(appConfig)
    lobbyService = LobbyService(qrCodeGenerator)

    chatGptAdapter = ChatGptAdapter()
    questionAnswerSetGenerator = QuestionAnswerSetGenerator(chatGptAdapter)
    questionService = QuestionService(chatGptAdapter, questionAnswerSetGenerator)
<<<<<<< HEAD

    paymentService = PaymentService()
    stripeAdapter = StripeAdapter()
=======
>>>>>>> c0b4eea (fix: create routers for FastAPI to clean up main file)
    
    availableOffersAdapter = AvailableOffersAdapter()
    offerSelectionProcessor = OfferSelectionProcessor()
    couponIdGenerator = CouponIdGenerator()
    googleSheetDatabaseAdapter = GoogleSheetDatabaseAdapter()
    couponsDatabase = CouponsDatabase(googleSheetDatabaseAdapter)
    assignedCouponsDatabase = AssignedCouponsDatabase(googleSheetDatabaseAdapter)
    couponRedemptionAdapter = CouponRedemptionAdapter()
    customerMessagingProcessor = CustomerMessagingProcessor()
    couponService = CouponService(availableOffersAdapter, offerSelectionProcessor, couponIdGenerator, couponsDatabase, assignedCouponsDatabase, couponRedemptionAdapter, customerMessagingProcessor)
    uvicorn.run(app, host="0.0.0.0", port=8000)
