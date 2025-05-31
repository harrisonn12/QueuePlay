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
from backend.PaymentService.PaymentService import PaymentService # Keep commented for now
from backend.commons.adapters.StripeAdapter import StripeAdapter # Keep commented for now
from backend.commons.adapters.RedisAdapter import RedisAdapter
from backend.CouponService.src.adapters.AvailableOffersAdapter import AvailableOffersAdapter
from backend.CouponService.src.OfferSelectionProcessor import OfferSelectionProcessor
from backend.CouponService.src.CouponIdGenerator import CouponIdGenerator
from backend.commons.adapters.SupabaseDatabaseAdapter import SupabaseDatabaseAdapter
from backend.UsernameService.UsernameService import UsernameService
from pydantic import BaseModel
import logging

# import stripe # Keep commented for now
import os
import uvicorn

# Basic logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load environment variables
load_dotenv()

# Determine the stage (dev/prod)
stage_str = os.environ.get("STAGE", "DEVO").lower()
stage = Stage.PROD if stage_str == 'prod' else Stage.DEVO
appConfig = AppConfig(stage=stage)
logging.info(f"Running in {appConfig.stage.name} stage.")

# Initialize all services
try:
    qrCodeGenerator = QRCodeGenerator(appConfig) 
    redis_adapter = RedisAdapter(app_config=appConfig) 
    lobbyService = LobbyService(qrCodeGenerator=qrCodeGenerator, redis_adapter=redis_adapter) 
    chatGptAdapter = ChatGptAdapter() 
    questionAnswerSetGenerator = QuestionAnswerSetGenerator(chatGptAdapter) 
    questionService = QuestionService(chatGptAdapter, questionAnswerSetGenerator) 
    usernameService = UsernameService(chatGptAdapter)
    # paymentService = PaymentService() # Keep commented
    # stripeAdapter = StripeAdapter() # Keep commented
    logging.info("Initialized services (excl. payment).")
except Exception as e:
    logging.error(f"Error initializing services: {e}", exc_info=True)
    # We'll continue even with errors, as the FastAPI app can start and show appropriate error messages

tags_metadata = [
    {"name": "Payment Service", "description": "User accounts, billing, membership, UI"},
    {"name": "Payment Service: Stripe Adapter", "description": "Stripe object actions"},
    {"name": "Payment Service: Supabase", "description": "Database actions"},
    {"name": "Username Service", "description": "Username generation and validation"},
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

class GenerateUsernameRequest(BaseModel):
    pass  # No parameters needed

class ValidateUsernameRequest(BaseModel):
    username: str

app = FastAPI(openapi_tags=tags_metadata)
# app.include_router(PaymentServiceRouter.router)
# app.include_router(PaymentDatabaseRouter.router)
# app.include_router(StripeRouter.router)

# CORS Middleware setup
if appConfig.stage == Stage.PROD:
    origins = [] # Define empty for prod if needed
else: # DEVO stage
    origins = [
        "http://localhost:5173", "http://localhost:80", "http://localhost",
    ]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logging.info("Added CORS middleware.")

# Health check endpoint for load balancer
@app.get("/health")
async def health_check():
    """Health check endpoint for load balancers."""
    return {"status": "healthy", "service": "queueplay-api"}

# Define Pydantic model for the request body
class CreateLobbyRequest(BaseModel):
   hostId: str
   gameType: str

@app.post("/createLobby")
async def createLobby(request_data: CreateLobbyRequest) -> dict:
    """Creates a new lobby and returns its ID."""
    logging.info(f"Received createLobby request: hostId={request_data.hostId}, gameType={request_data.gameType}")
    # Ensure lobbyService is initialized before calling
    if 'lobbyService' not in globals():
        logging.error("LobbyService not initialized!")
        return {"error": "Server configuration error"}
    lobby_details = await lobbyService.create_lobby(host_id=request_data.hostId, game_type=request_data.gameType)
    logging.info(f"lobbyService.create_lobby returned: {lobby_details}")
    if lobby_details and 'gameId' in lobby_details:
        logging.info(f"Lobby created successfully: {lobby_details['gameId']}")
        return {"gameId": lobby_details["gameId"]}
    else:
        logging.error(f"Failed to create lobby in LobbyService. Details: {lobby_details}")
        return {"error": "Failed to create lobby"}

@app.get("/getLobbyQRCode")
def getLobbyQRCode(gameId: str) -> dict:
    # Ensure lobbyService is initialized
    if 'lobbyService' not in globals():
        logging.error("LobbyService not initialized!")
        return {"error": "Server configuration error"}
    qr_data = lobbyService.generateLobbyQRCode(gameId)
    if qr_data:
        return {"qrCodeData": qr_data}
    else:
        logging.error(f"Failed to generate QR code for gameId: {gameId}")
        return {"error": "QR code generation failed"}

@app.get("/getQuestions")
def getQuestions(gameId: str, count: int = 10) -> dict:
    """ Fetches a set of questions, potentially based on gameId or defaults. """
    # Ensure questionService is initialized
    if 'questionService' not in globals():
        logging.error("QuestionService not initialized!")
        return {"error": "Server configuration error"}
    
    try:
        logging.info(f"Received getQuestions request for gameId: {gameId}, count: {count}")
        
        # Add extensive error handling around questionService call
        try:
            question_set = questionService.getQuestionAnswerSet(count)
            logging.info(f"QuestionService.getQuestionAnswerSet returned: {type(question_set)}")
        except Exception as e:
            logging.error(f"CRITICAL ERROR in questionService.getQuestionAnswerSet: {str(e)}", exc_info=True)
            return {"error": f"Question service error: {str(e)}"}
        
        if question_set and "questions" in question_set:
            question_count = len(question_set["questions"])
            logging.info(f"Returning {question_count} questions for gameId: {gameId}")
            return {"questions": question_set["questions"]}
        else:
            logging.error(f"Failed to retrieve questions for gameId: {gameId}. Return value: {question_set}")
            return {"error": "Failed to retrieve questions"}
    except Exception as outer_e:
        logging.error(f"Unhandled exception in getQuestions route: {str(outer_e)}", exc_info=True)
        return {"error": f"Server error: {str(outer_e)}"}

# Username Service Endpoints
@app.post("/username/generate", tags=["Username Service"])
async def generate_username(request_data: GenerateUsernameRequest = None) -> dict:
    """Generate a new username with moderation and validation."""
    if 'usernameService' not in globals():
        logging.error("UsernameService not initialized!")
        return {"error": "Server configuration error"}
    
    try:
        logging.info("Generating username")
        result = usernameService.generate_username()
        logging.info(f"Username generation result: {result}")
        return result
        
    except Exception as e:
        logging.error(f"Error generating username: {e}", exc_info=True)
        return {"error": f"Username generation failed: {str(e)}"}

@app.post("/username/validate", tags=["Username Service"])
async def validate_username(request_data: ValidateUsernameRequest) -> dict:
    """Validate a username with format checking and moderation."""
    if 'usernameService' not in globals():
        logging.error("UsernameService not initialized!")
        return {"error": "Server configuration error"}
    
    try:
        logging.info(f"Validating username: {request_data.username}")
        result = usernameService.validate_username(request_data.username)
        logging.info(f"Username validation result: {result}")
        return result
        
    except Exception as e:
        logging.error(f"Error validating username: {e}", exc_info=True)
        return {"error": f"Username validation failed: {str(e)}"}

# Keep payment routes commented out
@app.post("/createNewUser", tags=["Payment Service"])
def createNewUser(name: str, email: str):
    pass # Placeholder

@app.get("/listPaymentMethods", tags=["Payment Service: Stripe Adapter"])
def listPaymentMethod(customerId: str):
    pass # Placeholder

@app.put("/createPaymentIntent", tags=["Payment Service: Stripe Adapter"])
def createPaymentIntent(customerId, paymentMethodId, charge):
    pass # Placeholder

@app.post("/addPaymentMethod", tags=["Payment Service: Stripe Adapter"])
def addPaymentMethod(customerId: str, paymentId: str, defaultMethod: bool):
    pass # Placeholder

@app.post("/createPaymentMethod", tags=["Payment Service: Stripe Adapter"])
def createPaymentMethod(
    cardNumber: str,
    expMonth: str = "04",
    expYear: str = "2044",
    cvc: str = "939"):
    pass # Placeholder

@app.delete("/deletePaymentMethod", tags=["Payment Service: Stripe Adapter"])
def deletePaymentMethod(paymentMethodId):
    pass # Placeholder

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
    # supabaseDatabaseAdapter = SupabaseDatabaseAdapter()
    # couponsDatabase = CouponsDatabase(supabaseDatabaseAdapter)
    # gamersDatabase = GamersDatabase(supabaseDatabaseAdapter)
    # couponService = CouponService(availableOffersAdapter, offerSelectionProcessor, couponIdGenerator, couponsDatabase, gamersDatabase)
    
    # gamerManagementService = GamerManagementService(gamersDatabase, couponsDatabase)
    # paymentService = PaymentService()
    # stripeAdapter = StripeAdapter()
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
