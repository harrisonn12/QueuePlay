from pyparsing import Optional
from twilio.rest import Client

class TwilioAdapter():

    def __init__(self, accountSID: str, authToken: str):
        self.client = Client(accountSID, authToken)

        numbers = self.client.incomingPhoneNumbers.list()
        if numbers:
            self.fromPhoneNumber = numbers[0].phoneNumber
        else:
            raise ValueError("No Twilio phone numbers available to use.")

    # Sends an SMS message to a phone number
    def sendSMS(self, toPhoneNumber: str, message: str):
        try:
            msg = self.client.messages.create(
                body=message,
                from_=self.fromPhoneNumber,
                to=toPhoneNumber
            )
            return True
        except Exception as e:
            print(f"TwilioAdapter: Failed to send SMS to {toPhoneNumber}. Error: {e}")
            return False