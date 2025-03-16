import argparse
from LobbyService.src.QRCodeGenerator import QRCodeGenerator
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from PaymentService.PaymentService import PaymentService
from QuestionService.QuestionService import QuestionService
from commons.adapters.ChatGptAdapter import ChatGptAdapter
from QuestionService.src.QuestionAnswerSetGenerator import QuestionAnswerSetGenerator
from stripe import PaymentIntent
from LobbyService.LobbyService import LobbyService
from configuration.AppConfig import AppConfig
from configuration.AppConfig import Stage


app = FastAPI()

@app.get("/generateLobbyQRCode")
def generateLobbyQRCode(gameSessionId: str) -> str:
    return lobbyService.generateLobbyQRCode(gameSessionId)


@app.post("/createPaymentMethod")
def createPaymentMethod():
    return PaymentService.createPaymentMethod()

@app.post("/createIntent")
def setUpPaymentIntent(paymentMethodID):
    return PaymentService.createIntent(paymentMethodID)

@app.post("/setupDefaultPaymentMethod")
def setupDefaultPaymentMethod():
    paymentMethod = PaymentService.createPaymentMethod();
    setupIntent = PaymentService.createSetupIntent(paymentMethod.id);
    paymentIntent = PaymentService.createPaymentIntent(setupIntent.customer, paymentMethod.id)

    return paymentIntent;

@app.post("/getQuestionAnswerSet")
def getQuestionAnswerSet():
    chatGptAdapter = ChatGptAdapter()
    questionAnswerSetGenerator = QuestionAnswerSetGenerator(chatGptAdapter)
    questionService = QuestionService(chatGptAdapter, questionAnswerSetGenerator)

    return questionService.getQuestionAnswerSet(10)


if __name__ == '__main__':

    parser = argparse.ArgumentParser(description='Configure environment for the application.')
    parser.add_argument('--env', type=str, choices=['dev', 'prod'], default='dev', help='Select the environment: dev or prod')
    args = parser.parse_args()

    appConfig = AppConfig()

    if args.env == 'prod':
        appConfig.stage = Stage.PROD
        origins = [
            "https://your-production-site.com",  # Update with your production site
        ]

    else:
        appConfig.stage = Stage.DEVO
        origins = [
            "http://localhost:5173",
            "http://localhost",
            "http://localhost:8080",
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
    uvicorn.run(app, host="0.0.0.0", port=8000)
