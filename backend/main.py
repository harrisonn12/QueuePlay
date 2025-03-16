from dotenv import load_dotenv
from fastapi import FastAPI
import uvicorn
from PaymentService.PaymentService import PaymentService
from stripe import PaymentIntent

app = FastAPI()

@app.post("/setupDefaultPaymentMethod")
def setupDefaultPaymentMethod():
    paymentMethod = PaymentService.createPaymentMethod();
    setupIntent = PaymentService.createSetupIntent(paymentMethod.id);
    paymentIntent = PaymentService.createPaymentIntent(setupIntent.customer, paymentMethod.id)

    return paymentIntent;


if __name__ == '__main__':
    load_dotenv()
    uvicorn.run(app, host="0.0.0.0", port=8000)
