import argparse
from commons.adapters.ChatGptAdapter import ChatGptAdapter
from configuration.AppConfig import AppConfig
from configuration.AppConfig import Stage
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, Request, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from LobbyService.LobbyService import LobbyService
from LobbyService.src.QRCodeGenerator import QRCodeGenerator
from QuestionService.QuestionService import QuestionService
from QuestionService.src.QuestionAnswerSetGenerator import QuestionAnswerSetGenerator
from PaymentService.PaymentService import PaymentService # Keep commented for now
from commons.adapters.StripeAdapter import StripeAdapter # Keep commented for now
from commons.adapters.RedisAdapter import RedisAdapter
from CouponService.src.adapters.AvailableOffersAdapter import AvailableOffersAdapter
from CouponService.src.OfferSelectionProcessor import OfferSelectionProcessor
from CouponService.src.CouponIdGenerator import CouponIdGenerator
from commons.adapters.SupabaseDatabaseAdapter import SupabaseDatabaseAdapter
from UsernameService.UsernameService import UsernameService
from AuthService.AuthService import AuthService
from RateLimitService.RateLimitService import RateLimitService
from middleware.auth_middleware import create_auth_dependencies
from pydantic import BaseModel
import logging
import os
import uvicorn
import secrets

# import stripe # Keep commented for now

# Basic logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load environment variables
load_dotenv()

# Determine the stage (dev/prod)
stage_str = os.environ.get("STAGE", "DEVO").lower()
stage = Stage.PROD if stage_str == 'prod' else Stage.DEVO
appConfig = AppConfig(stage=stage)
logging.info(f"Running in {appConfig.stage.name} stage.")

# Get JWT secret from environment or generate one
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    if stage == Stage.PROD:
        raise ValueError("JWT_SECRET environment variable is required in production")
    else:
        JWT_SECRET = secrets.token_urlsafe(32)
        logging.warning("Using generated JWT secret for development. Set JWT_SECRET env var for production.")

# Initialize all services
try:
    qrCodeGenerator = QRCodeGenerator(appConfig)
    redis_adapter = RedisAdapter(app_config=appConfig)
    lobbyService = LobbyService(qrCodeGenerator=qrCodeGenerator, redis_adapter=redis_adapter)
    chatGptAdapter = ChatGptAdapter()
    questionAnswerSetGenerator = QuestionAnswerSetGenerator(chatGptAdapter)
    questionService = QuestionService(chatGptAdapter, questionAnswerSetGenerator)
    usernameService = UsernameService(chatGptAdapter)
    
    # Initialize new security services
    auth_service = AuthService(redis_adapter, JWT_SECRET)
    rate_limit_service = RateLimitService(redis_adapter)
    
    # Create auth dependencies
    auth_deps = create_auth_dependencies(auth_service, rate_limit_service)
    
    logging.info("Initialized all services including security services.")
except Exception as e:
    logging.error(f"Error initializing services: {e}", exc_info=True)
    # We'll continue even with errors, as the FastAPI app can start and show appropriate error messages

tags_metadata = [
    {"name": "Authentication", "description": "JWT token management and user sessions"},
    {"name": "Game API", "description": "Protected game endpoints requiring authentication"},
    {"name": "Public API", "description": "Public endpoints that don't require authentication"},
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

class CreateLobbyRequest(BaseModel):
   hostId: str
   gameType: str

class LoginRequest(BaseModel):
    user_id: str
    username: str = None

class TokenRequest(BaseModel):
    pass  # No parameters needed, uses session cookie

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

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers and rate limit headers to responses."""
    response = await call_next(request)
    
    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # Add rate limit headers if available from auth middleware
    if hasattr(request.state, 'rate_limit_headers'):
        for header, value in request.state.rate_limit_headers.items():
            response.headers[header] = value
    
    return response

# === AUTHENTICATION ENDPOINTS ===

@app.post("/auth/login", tags=["Authentication"])
async def login(request: Request, login_data: LoginRequest, response: Response):
    """
    Create a new user session and return session cookie.
    This simulates login - in production, you'd verify credentials here.
    """
    client_ip = auth_deps["middleware"].get_client_ip(request)
    
    # Check login attempt rate limit
    is_allowed, limit_info = await rate_limit_service.check_login_attempt_limit(client_ip)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
            headers={
                "X-RateLimit-Limit": str(limit_info.get("limit", 0)),
                "X-RateLimit-Remaining": str(limit_info.get("remaining", 0)),
                "X-RateLimit-Reset": str(limit_info.get("reset_time", 0))
            }
        )
    
    # Temporarily comment out CORS validation for testing
    # cors_valid = await auth_deps["validate_cors_and_referer"](request)
    # if not cors_valid:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Request not allowed from this origin"
    #     )
    
    # Create session
    session_id = await auth_service.create_session(
        user_id=login_data.user_id,
        metadata={"username": login_data.username, "ip": client_ip}
    )
    
    # put session_id in httpOnly cookie
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True, #js can't access it
        secure=(appConfig.stage == Stage.PROD), #HTTPS only in prod
        samesite="lax", #CSRF protection
        max_age=24 * 3600  # 24 hours
    )
    
    logging.info(f"User {login_data.user_id} logged in from {client_ip}")
    return {"success": True, "message": "Login successful"}

@app.post("/auth/token", tags=["Authentication"])
async def get_token(request: Request):
    """
    Generate JWT token from session cookie.
    Called by frontend to get tokens for API requests.
    """
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No active session"
        )
    
    client_ip = auth_deps["middleware"].get_client_ip(request)
    
    # Check token generation rate limit
    is_allowed, limit_info = await rate_limit_service.check_token_generation_limit(client_ip)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Token generation rate limit exceeded",
            headers={
                "X-RateLimit-Limit": str(limit_info.get("limit", 0)),
                "X-RateLimit-Remaining": str(limit_info.get("remaining", 0)),
                "X-RateLimit-Reset": str(limit_info.get("reset_time", 0))
            }
        )
    
    # Generate JWT token
    token = await auth_service.generate_jwt_token(session_id)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session"
        )
    
    return {"access_token": token, "token_type": "bearer", "expires_in": 900}  # 15 minutes

@app.post("/auth/logout", tags=["Authentication"])
async def logout(request: Request, response: Response):
    """Logout user and invalidate session."""
    session_id = request.cookies.get("session_id")
    if session_id:
        await auth_service.invalidate_session(session_id)
    
    # Clear session cookie
    response.delete_cookie("session_id")
    return {"success": True, "message": "Logout successful"}

# === PROTECTED GAME ENDPOINTS ===

@app.post("/createLobby", tags=["Game API"])
async def createLobby(request: Request, request_data: CreateLobbyRequest,
                     current_user: dict = Depends(auth_deps["get_current_user"])) -> dict:
    """Creates a new lobby and returns its ID. Requires authentication."""
    user_id = current_user["user_id"]
    logging.info(f"User {user_id} creating lobby: hostId={request_data.hostId}, gameType={request_data.gameType}")
    
    # Validate CORS and referer
    cors_valid = await auth_deps["validate_cors_and_referer"](request)
    if not cors_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Request not allowed from this origin"
        )
    
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

@app.get("/getLobbyQRCode", tags=["Game API"])
def getLobbyQRCode(request: Request, gameId: str,
                   current_user: dict = Depends(auth_deps["get_current_user"])) -> dict:
    """Get QR code for a lobby. Requires authentication."""
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

@app.get("/getQuestions", tags=["Game API"])
async def getQuestions(request: Request, gameId: str, count: int = 10,
                      current_user: dict = Depends(auth_deps["get_current_user"])) -> dict:
    """Fetches a set of questions. Requires authentication and rate limiting."""
    user_id = current_user["user_id"]
    
    # Check question generation rate limit
    await auth_deps["check_question_generation_limit"](user_id)
    
    # Validate CORS and referer
    cors_valid = await auth_deps["validate_cors_and_referer"](request)
    if not cors_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Request not allowed from this origin"
        )
    
    # Ensure questionService is initialized
    if 'questionService' not in globals():
        logging.error("QuestionService not initialized!")
        return {"error": "Server configuration error"}

    try:
        logging.info(f"Requesting questions for gameId: {gameId}, count: {count}")

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

# === PUBLIC ENDPOINTS (No Authentication Required) ===

# Username Service Endpoints
@app.post("/username/generate", tags=["Public API"])
async def generate_username(request_data: GenerateUsernameRequest = None) -> dict:
    """Generate a new username with moderation and validation. Public endpoint."""
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

@app.post("/username/validate", tags=["Public API"])
async def validate_username(request_data: ValidateUsernameRequest) -> dict:
    """Validate a username with format checking and moderation. Public endpoint."""
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

# === USER USAGE STATISTICS ===

@app.get("/user/stats", tags=["Game API"])
async def get_user_stats(current_user: dict = Depends(auth_deps["get_current_user"])) -> dict:
    """Get current usage statistics for the authenticated user."""
    user_id = current_user["user_id"]
    stats = await rate_limit_service.get_user_usage_stats(user_id)
    return {"user_id": user_id, "usage_stats": stats}

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
    pass # Placeholder - was: return couponService.getCoupons(getCouponRequest.storeId, getCouponRequest.gamerId)

@app.post("/destroyCoupon")
def destroyCoupon(destroyCouponRequest: DestroyCouponRequest):
    pass # Placeholder - was: return couponService.destroyCoupon(destroyCouponRequest.couponId)

@app.post("/getExpiringCoupons")
def getGamersWithExpiringCoupons():
    pass # Placeholder - was: return gamerManagementService.getGamersWithExpiringCoupons()

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
            "queue-play-34edc7c1b26f.herokuapp.com/",  # Update with your production site
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
