import argparse
from backend.commons.adapters.ChatGptAdapter import ChatGptAdapter
from backend.configuration.AppConfig import AppConfig
from backend.configuration.AppConfig import Stage
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.LobbyService.LobbyService import LobbyService
from backend.LobbyService.src.QRCodeGenerator import QRCodeGenerator
from backend.QuestionService.QuestionService import QuestionService
from backend.QuestionService.src.QuestionAnswerSetGenerator import QuestionAnswerSetGenerator
from backend.PaymentService.PaymentService import PaymentService
from backend.PaymentService.adapters.StripeAdapter import StripeAdapter
from backend.commons.adapters.RedisAdapter import RedisAdapter
from pydantic import BaseModel
import logging

import stripe
import os
import uvicorn



tags_metadata = [
    {"name": "Payment Service", "description": "User accounts, billing, membership, UI"},
    {"name": "Payment Service: Stripe Adapter", "description": "Stripe object actions"},
    {"name": "Payment Service: Supabase", "description": "Database actions"},
]

class CreateCouponRequest(BaseModel):
    storeId: int
    gameId: str

class AssignCouponRequest(BaseModel):
    couponId: str
    winnerId: str

class GetCouponRequest(BaseModel):
    storeId: int
    gamerId: str

class DestroyCouponRequest(BaseModel):
    couponId: str

app = FastAPI(openapi_tags=tags_metadata)
app.include_router(PaymentServiceRouter.router)
app.include_router(PaymentDatabaseRouter.router)
app.include_router(StripeRouter.router)

# Define Pydantic model for the request body
class CreateLobbyRequest(BaseModel):
   hostId: str
   gameType: str

@app.post("/createLobby")
async def createLobby(request_data: CreateLobbyRequest) -> dict:
    """Creates a new lobby and returns its ID."""
    logging.info(f"Received createLobby request: hostId={request_data.hostId}, gameType={request_data.gameType}")
    lobby_details = await lobbyService.create_lobby(host_id=request_data.hostId, game_type=request_data.gameType)
    logging.info(f"lobbyService.create_lobby returned: {lobby_details}")
    if lobby_details:
        logging.info(f"Lobby created successfully: {lobby_details['gameId']}")
        return {"gameId": lobby_details["gameId"]}
    else:
        logging.error("Failed to create lobby in LobbyService.")
        # Handle error, maybe raise HTTPException
        return {"error": "Failed to create lobby"}

@app.get("/getLobbyQRCode")
def getLobbyQRCode(gameId: str) -> dict:
    qr_data = lobbyService.generateLobbyQRCode(gameId)
    if qr_data:
        return {"qrCodeData": qr_data}
    else:
        logging.error(f"Failed to generate QR code for gameId: {gameId}")
        return {"error": "QR code generation failed"}

@app.get("/getQuestions")
def getQuestions(gameId: str, count: int = 10) -> dict:
    """ Fetches a set of questions, potentially based on gameId or defaults. """
    logging.info(f"Received getQuestions request for gameId: {gameId}, count: {count}")
    question_set = questionService.getQuestionAnswerSet(count)
    if question_set and "questions" in question_set:
        logging.info(f"Returning {len(question_set['questions'])} questions for gameId: {gameId}")
        return {"questions": question_set["questions"]}
    else:
        logging.error(f"Failed to retrieve questions for gameId: {gameId}")
        return {"error": "Failed to retrieve questions"}

@app.post("/createNewUser", tags=["Payment Service"])
def createNewUser(name: str, email: str):
    """ Generate a new user account """
    return paymentService.createAccount(name, email)

@app.get("/listPaymentMethods", tags=["Payment Service: Stripe Adapter"])
def listPaymentMethod(customerId: str):
    """ Display all Payment Methods """
    return stripeAdapter.listPaymentMethods(customerId)

@app.put("/createPaymentIntent", tags=["Payment Service: Stripe Adapter"])
def createPaymentIntent(customerId, paymentMethodId, charge):
    return stripeAdapter.createPaymentIntent(customerId, paymentMethodId, charge)

@app.post("/addPaymentMethod", tags=["Payment Service: Stripe Adapter"])
def addPaymentMethod(customerId: str, paymentId: str, defaultMethod: bool):
    """ Attach Payment Method to a Customer"""
    return paymentService.addPaymentMethod(customerId, paymentId, defaultMethod)

@app.post("/createPaymentMethod", tags=["Payment Service: Stripe Adapter"])
def createPaymentMethod(
    cardNumber: str,
    expMonth: str = "04",
    expYear: str = "2044",
    cvc: str = "939"):
    """ Generate a Payment Method """
    
    cardDetails = {
        "number": cardNumber,
        "exp_month": expMonth,
        "exp_year": expYear,
        "cvc": cvc
    }

    return stripeAdapter.createPaymentMethod(cardDetails)

@app.post("/assignCoupon")
def assignCoupon(assignCouponRequest: AssignCouponRequest):
    return couponService.assignCoupon(assignCouponRequest.couponId, assignCouponRequest.winnerId)

@app.post("/createCoupon")
def createCoupon(createCouponRequest: CreateCouponRequest):
    return couponService.createCoupon(createCouponRequest.storeId, createCouponRequest.gameId)

@app.post("/getCoupons")
def getCoupons(getCouponRequest: GetCouponRequest):
    return couponService.getCoupons(getCouponRequest.storeId, getCouponRequest.gamerId)

@app.post("/destroyCoupon")
def destroyCoupon(destroyCouponRequest: DestroyCouponRequest):
    return couponService.destroyCoupon(destroyCouponRequest.couponId)

@app.post("/getExpiringCoupons")
def getGamersWithExpiringCoupons():
    return gamerManagementService.getGamersWithExpiringCoupons()

if __name__ == '__main__':

    # Basic logging configuration
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

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
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                    "http://localhost",
                    "http://localhost:8080",
                    "http://127.0.0.1:8080",
                ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    load_dotenv()

    qrCodeGenerator = QRCodeGenerator(appConfig)

    # Initialize Redis Adapter
    redis_adapter = RedisAdapter(appConfig) 

    # Inject dependencies into LobbyService
    lobbyService = LobbyService(qrCodeGenerator=qrCodeGenerator, redis_adapter=redis_adapter)

    chatGptAdapter = ChatGptAdapter()
    questionAnswerSetGenerator = QuestionAnswerSetGenerator(chatGptAdapter)
    questionService = QuestionService(chatGptAdapter, questionAnswerSetGenerator)

    availableOffersAdapter = AvailableOffersAdapter()
    offerSelectionProcessor = OfferSelectionProcessor()
    couponIdGenerator = CouponIdGenerator()
    supabaseDatabaseAdapter = SupabaseDatabaseAdapter()
    couponsDatabase = CouponsDatabase(supabaseDatabaseAdapter)
    gamersDatabase = GamersDatabase(supabaseDatabaseAdapter)
    couponService = CouponService(availableOffersAdapter, offerSelectionProcessor, couponIdGenerator, couponsDatabase, gamersDatabase)
    
    gamerManagementService = GamerManagementService(gamersDatabase, couponsDatabase)
    paymentService = PaymentService()
    stripeAdapter = StripeAdapter()
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
