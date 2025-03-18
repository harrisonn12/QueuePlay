import stripe
import os
from ..testData.StripeTestDeets import StripeTestDeets as STD
from ..exceptions.PaymentMethodExistsException import PaymentMethodExistsException
from dotenv import load_dotenv

load_dotenv()

class StripeAdapter:
    def __init__(self):
        # Stripe Keys
        self.PUBLISHKEY = os.getenv("STRIPE_PUBLISHABLE_KEY")
        self.SECRETKEY = os.getenv("STRIPE_SECRET_KEY")

    # PaymentMethod object can only be attached to one customer
    def createPaymentMethod(self, billingDetails=STD.BILLINGDEETS, cardDetails=STD.CARDDEETS)-> stripe.PaymentMethod:
        stripe.api_key = self.PUBLISHKEY
        
        return stripe.PaymentMethod.create(
            type="card",
            billing_details=billingDetails,
            card=cardDetails
        )

    # Acquires payment method without charging and attaches to a customer
    def createSetupIntent(self, paymentMethodId, customerId = STD.CUSTOMERID, defaultMethod=True) -> stripe.SetupIntent:
        # creating intent requires secret key
        stripe.api_key = self.SECRETKEY
        
        try:
            intent = stripe.SetupIntent.create(
                automatic_payment_methods={
                    "enabled": True,
                    "allow_redirects": "never"
                },
                customer = customerId,
                payment_method = paymentMethodId,
                usage="off_session",
            )
            
            if self.customerHasThisPaymentMethod(customerId, paymentMethodId):
                raise PaymentMethodExistsException('Customer already has this payment card.', paymentMethodId, intent.id)
            
            stripe.SetupIntent.confirm(intent.id, paymentMethodId)
            
            if defaultMethod:
                self.setDefaultPaymentMethod(customerId, paymentMethodId)
            
            return intent
        except PaymentMethodExistsException as e:
            print(f"Unexpected Error: {str(e)}")
            stripe.SetupIntent.cancel(e.setupIntentId)
            return None
        except Exception as e:
            print(f"Unexpected Error: {str(e)}")
            return None
        
    def getPaymentMethodFingerPrint(self, paymentMethodId)->str:
        try:
            paymentMethod = stripe.PaymentMethod.retrieve(paymentMethodId)
            paymentType = paymentMethod.type
            return paymentMethod[paymentType].fingerprint
        except Exception as e:
            print(f"Unable to retrieve payment method fingerprint: {str(e)}")
            return None

    def customerHasThisPaymentMethod(self, customerId, paymentMethodId):
        stripe.api_key = self.SECRETKEY

        # get card fingerprint of new payment method
        newPrint = self.getPaymentMethodFingerPrint(paymentMethodId)
        
        # if new payment method does not have a fingerprint
        if newPrint == None:
            return False
        
        # get payment method list from customer
        paymentMethods = stripe.Customer.list_payment_methods(customerId).data
        if len(paymentMethods) == 0: return False

        # check if customer has payment method
        for method in paymentMethods:
            existingPrint = self.getPaymentMethodFingerPrint(method.id)
            if existingPrint == newPrint:
                return True
        
        return False

    def setDefaultPaymentMethod(self, customerId, paymentMethodId) -> stripe.Customer:
        return stripe.Customer.modify(
            customerId,
            invoice_settings={
                "default_payment_method": paymentMethodId
            }
        )
    
    # Triggers a charge to a PaymentMethod (upon confirmation)
    def createPaymentIntent(self, customerId, paymentMethodId) -> stripe.PaymentIntent:
        stripe.api_key = self.SECRETKEY
    
        paymentIntent = stripe.PaymentIntent.create(
            amount=985,
            currency="usd",
            customer=customerId,
            payment_method=paymentMethodId,
            automatic_payment_methods={
                "enabled": True,
                "allow_redirects": "never"
            }
        )

        return stripe.PaymentIntent.confirm(paymentIntent.id)

    def displayAllSetupIntents(self) -> stripe.ListObject[stripe.PaymentIntent]:
        stripe.api_key = self.SECRETKEY

        return stripe.SetupIntent.list()

    def cancelAllSetupIntents(self) -> stripe.ListObject[stripe.PaymentIntent]:
        stripe.api_key = self.SECRETKEY

        # get all SetupIntents
        setupIntents = stripe.SetupIntent.list().data
        
        if (len(setupIntents) == 0):
            return 'No existing setupIntents'
        
        # cancel each SetupIntent
        for intent in setupIntents:
            stripe.SetupIntent.cancel(intent.id)

        return stripe.SetupIntent.list()
    
    def createCustomer(self, user) -> stripe.Customer:
        stripe.api_key = self.SECRETKEY

        try:
            customer = stripe.Customer.create(
                name = user.get('name'),
                email = user.get('email')
            )

            return customer
        except Exception as e:
            # print(f"Unexpected error: {str(e)}")
            return str(e)


