from dotenv import load_dotenv
from fastapi import FastAPI
import uvicorn
from PaymentService.PaymentService import PaymentService
from stripe import PaymentIntent

app = FastAPI()

@app.get("/exampleGetAPI")
def exampleGetAPI() -> str:
    return "Hello"

@app.post("/createPaymentMethod")
def createPaymentMethod():
    return PaymentService.createPaymentMethod()

@app.post("/createIntent")
def setUpPaymentIntent(paymentMethodID):
    return PaymentService.createIntent(paymentMethodID)


if __name__ == '__main__':
    load_dotenv()
    uvicorn.run(app, host="0.0.0.0", port=8000)
