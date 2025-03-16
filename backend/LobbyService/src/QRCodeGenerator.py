from io import BytesIO
import base64
import configparser
import qrcode
from qrcode.image.pil import PilImage
from configuration.AppConfig import AppConfig, Stage


class QRCodeGenerator:

    def __init__(self, appConfig: AppConfig):
        self.appConfig = appConfig
        self.config = configparser.ConfigParser()
        self.config.read('backend/configuration/AppConfig.ini')

    def generate(self, gameSessionId: str) -> str:
        keys = self.config.keys()
        for key in keys:
            print(key)
        host = self.config.get('Host', 'Devo')
        if self.appConfig.stage == Stage.PROD:

            # Example of usage, you can customize as needed
            host = self.config['Host']['Prod']
        img = qrcode.make(host + '/lobby?{}'.format(gameSessionId))

        type(img)  # qrcode.image.pil.PilImage
        return self.__serializePilImageToBase64(img)

    def __serializePilImageToBase64(self, image: PilImage, format: str = "JPEG") -> str:
        """
        Converts a PIL Image object to a base64 string.

        Args:
            image: The PIL Image object to convert.
            format: The image format to use for encoding (e.g., "JPEG", "PNG").

        Returns:
            A base64 string representation of the image.
        """
        buffered = BytesIO()
        image.save(buffered, format=format)
        img_byte = buffered.getvalue()
        img_str = base64.b64encode(img_byte).decode()
        return img_str
