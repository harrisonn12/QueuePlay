import stripe
from ..enums.StripeTestDeets import StripeTestDeets as STD

class PaymentService:
    # PaymentMethod object can only be attached to one customer
    def createPaymentMethod(self, billingDetails=STD.BILLINGDEETS, cardDetails=STD.CARDDEETS)-> stripe.PaymentMethod:
        stripe.api_key = STD.PUBLISHKEY
        
        return stripe.PaymentMethod.create(
            type="card",
            billing_details=billingDetails,
            card=cardDetails
        )

    # Acquires customer payment method without charging
    def createSetupIntent(self, paymentMethodId, customerId = STD.CUSTOMERID) -> stripe.SetupIntent:
        # creating intent requires secret key
        stripe.api_key = STD.SECRETKEY
        
        intent = stripe.SetupIntent.create(
                automatic_payment_methods={
                    "enabled": True,
                    "allow_redirects": "never"
                },
                customer = customerId,
                payment_method = paymentMethodId,
                usage="off_session",
                confirm=True
            )
        
        PaymentService.setDefaultPaymentMethod(self, customerId, paymentMethodId)
        
        return intent

    def setDefaultPaymentMethod(self, customerId, paymentMethodId) -> stripe.Customer:
        return stripe.Customer.modify(
            customerId,
            invoice_settings={
                "default_payment_method": paymentMethodId
            }
        )
    
    # Triggers a charge to a PaymentMethod (upon confirmation)
    def createPaymentIntent(self, customerId, paymentMethodId) -> stripe.PaymentIntent:
        stripe.api_key = STD.SECRETKEY;
    
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
        stripe.api_key = STD.SECRETKEY

        return stripe.SetupIntent.list()

    def cancelAllSetupIntents(self) -> stripe.ListObject[stripe.PaymentIntent]:
        stripe.api_key = STD.SECRETKEY

        # get all SetupIntents
        setupIntents = stripe.SetupIntent.list().data
        
        if (len(setupIntents) == 0):
            return 'No existing setupIntents'
        
        # cancel each SetupIntent
        for intent in setupIntents:
            stripe.SetupIntent.cancel(intent.id)

        return stripe.SetupIntent.list()