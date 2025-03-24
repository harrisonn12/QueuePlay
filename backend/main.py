import argparse
from commons.adapters.ChatGptAdapter import ChatGptAdapter
from configuration.AppConfig import AppConfig
from configuration.AppConfig import Stage
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from LobbyService.LobbyService import LobbyService
from LobbyService.src.QRCodeGenerator import QRCodeGenerator
from QuestionService.QuestionService import QuestionService
from QuestionService.src.QuestionAnswerSetGenerator import QuestionAnswerSetGenerator
from PaymentService.PaymentService import PaymentService
from PaymentService.adapters.StripeAdapter import StripeAdapter

import stripe
import os
import uvicorn

stripeAdapter = StripeAdapter()
paymentService = PaymentService()

tags_metadata = [
    {"name": "Payment Service", "description": "User accounts, billing, membership, UI"},
    {"name": "Payment Service: Stripe Adapter", "description": "Stripe object actions"},
]

app = FastAPI(openapi_tags=tags_metadata)

@app.get("/generateLobbyQRCode")
def generateLobbyQRCode(gameSessionId: str) -> str:
    return lobbyService.generateLobbyQRCode(gameSessionId)

@app.post("/getQuestionAnswerSet")
def getQuestionAnswerSet():
    return questionService.getQuestionAnswerSet(10)

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

@app.delete("/deletePaymentMethod", tags=["Payment Service: Stripe Adapter"])
def deletePaymentMethod(paymentMethodId):
    """ Detaches a Payment Method from Customer; Not Retachable """
    return stripeAdapter.detachPaymentMethod(paymentMethodId)

@app.delete("/deleteAllPaymentMethods", tags=["Payment Service: Stripe Adapter"])
def deleteAllPaymentMethods(customerId):
    """ Detaches all Payment Methods attached to a Customer """
    return stripeAdapter.detachAllPaymentMethods(customerId)

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

    chatGptAdapter = ChatGptAdapter()
    questionAnswerSetGenerator = QuestionAnswerSetGenerator(chatGptAdapter)
    questionService = QuestionService(chatGptAdapter, questionAnswerSetGenerator)

    paymentService = PaymentService()
    stripeAdapter = stripeAdapter()
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
