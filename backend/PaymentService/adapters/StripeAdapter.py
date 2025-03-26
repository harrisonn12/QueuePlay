import stripe
import os
from ..exceptions.DuplicatePaymentException import DuplicatePaymentException
from dotenv import load_dotenv

load_dotenv()

class StripeAdapter:
    def __init__(self):
        # Stripe Keys
        self.PUBLISHKEY = os.getenv("STRIPE_PUBLISHABLE_KEY")
        self.SECRETKEY = os.getenv("STRIPE_SECRET_KEY")

    def createPaymentMethod(self, cardDetails: dict, billingDetails)-> stripe.PaymentMethod:
        """ PaymentMethod object can only be attached to one customer """
        stripe.api_key = self.PUBLISHKEY
        
        return stripe.PaymentMethod.create(
            type="card",
            card=cardDetails,
            billing_details=billingDetails,
        )

    def createSetupIntent(self, paymentMethodId, customerId, defaultMethod=True) -> stripe.SetupIntent:
        """ Acquires payment method without charging and attaches to a customer; Use Payment Intent if charging immediately. """
        stripe.api_key = self.SECRETKEY
        
        try:
            if self.customerHasThisPaymentMethod(customerId, paymentMethodId):
                raise DuplicatePaymentException('Customer already has this payment card', paymentMethodId, customerId)

            intent = stripe.SetupIntent.create(
                automatic_payment_methods={
                    "enabled": True,
                    "allow_redirects": "never"
                },
                confirm=True,
                customer = customerId,
                payment_method = paymentMethodId,
                usage="off_session",
            )

            
            if defaultMethod:
                self.setDefaultPaymentMethod(customerId, paymentMethodId)
            
            return intent

        except DuplicatePaymentException as e:
            print(e)
            return None
        
        except Exception as e:
            print(f"Unexpected Error: {str(e)}")
            return None
        
    def detachPaymentMethod(self, paymentMethodId: str) -> bool:
        stripe.api_key = self.SECRETKEY

        try:
            stripe.PaymentMethod.detach(paymentMethodId)
            return True
        except Exception as e:
            print(f'Unable to detach: {str(e)}')
            return False
        
    def detachAllPaymentMethods(self, customerId) -> None:
        stripe.api_key = self.SECRETKEY

        try:
            methods = stripe.Customer.list_payment_methods(customerId).data

            for method in methods:
                id = method.id
                self.detachPaymentMethod(id)
        except Exception as e:
            print(f'Unable to detach all payment methods: {str(e)}')

    def getPaymentMethodFingerPrint(self, paymentMethodId)->str:
        try:
            paymentMethod = stripe.PaymentMethod.retrieve(paymentMethodId)
            paymentType = paymentMethod.type
            fingerprint = paymentMethod[paymentType].fingerprint

            return fingerprint
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
    
    def createPaymentIntent(self, customerId, paymentMethodId, chargeAmt = 999) -> stripe.PaymentIntent:
        """ Triggers a charge to a PaymentMethod (upon confirmation) """
        stripe.api_key = self.SECRETKEY
    
        paymentIntent = stripe.PaymentIntent.create(
            amount=chargeAmt,
            currency="usd",
            customer=customerId,
            confirm=True,
            payment_method=paymentMethodId,
            automatic_payment_methods={
                "enabled": True,
                "allow_redirects": "never"
            },
            setup_future_usage="off_session"
        )

        """ return stripe.PaymentIntent.confirm(paymentIntent.id) """
        return paymentIntent

    def listPaymentMethods(self, customerId) -> stripe.ListObject[stripe.PaymentMethod]:
        stripe.api_key = self.SECRETKEY

        return stripe.PaymentMethod.list(
            customer=customerId
        )

    def listSetupIntents(self) -> stripe.ListObject[stripe.PaymentIntent]:
        stripe.api_key = self.SECRETKEY

        return stripe.SetupIntent.list()

    def cancelSetupIntents(self) -> stripe.ListObject[stripe.PaymentIntent]:
        stripe.api_key = self.SECRETKEY

        # get all SetupIntents
        setupIntents = stripe.SetupIntent.list().data
        
        if (len(setupIntents) == 0):
            return 'No existing setupIntents'
        
        # cancel each SetupIntent
        for intent in setupIntents:
            stripe.SetupIntent.cancel(intent.id)

        return self.getAllSetupIntents()
    
    def createCustomer(self, user) -> stripe.Customer:
        stripe.api_key = self.SECRETKEY

        try:
            customer = stripe.Customer.create(
                name = user.get('name', ''),
                email = user.get('email', '')
            )

            return customer
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            return str(e)


