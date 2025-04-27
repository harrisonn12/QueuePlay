from CouponService.CouponService import CouponService
from CouponService.src.CouponIdGenerator import CouponIdGenerator
from CouponService.src.OfferSelectionProcessor import OfferSelectionProcessor
from CouponService.src.adapters.AvailableOffersAdapter import AvailableOffersAdapter
from CouponService.src.databases.CouponsDatabase import CouponsDatabase
from LobbyService.LobbyService import LobbyService
from LobbyService.src.QRCodeGenerator import QRCodeGenerator
from QuestionService.QuestionService import QuestionService
from QuestionService.src.QuestionAnswerSetGenerator import QuestionAnswerSetGenerator
from GamerManagementService.src.databases.GamersDatabase import GamersDatabase
from GamerManagementService.GamerManagementService import GamerManagementService
from commons.adapters.SupabaseDatabaseAdapter import SupabaseDatabaseAdapter
from commons.adapters.ChatGptAdapter import ChatGptAdapter
from configuration.AppConfig import AppConfig
from configuration.AppConfig import Stage
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from routers import StripeRouter, PaymentDatabaseRouter, PaymentServiceRouter
import argparse, uvicorn

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

@app.get("/generateLobbyQRCode")
def generateLobbyQRCode(gameSessionId: str) -> str:
    return lobbyService.generateLobbyQRCode(gameSessionId)

@app.post("/getQuestionAnswerSet")
def getQuestionAnswerSet():
    return questionService.getQuestionAnswerSet(10)

@app.post("/createCoupon")
def createCoupon(createCouponRequest: CreateCouponRequest):
    return couponService.createCoupon(createCouponRequest.storeId, createCouponRequest.gameId)

@app.post("/assignCoupon")
def assignCoupon(assignCouponRequest: AssignCouponRequest):
    return couponService.assignCoupon(assignCouponRequest.couponId, assignCouponRequest.winnerId)

@app.post("/createCoupon")
def createCoupon(createCouponRequest: CreateCouponRequest):
    return couponService.createCoupon(createCouponRequest.storeId, createCouponRequest.gameId)

@app.post("/assignCoupon")
def assignCoupon(assignCouponRequest: AssignCouponRequest):
    return couponService.assignCoupon(assignCouponRequest.couponId, assignCouponRequest.winnerId)

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
    lobbyService = LobbyService(qrCodeGenerator)

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
    uvicorn.run(app, host="0.0.0.0", port=8000)
