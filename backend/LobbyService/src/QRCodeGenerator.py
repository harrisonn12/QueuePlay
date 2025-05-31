from io import BytesIO
import base64
import configparser
import qrcode
from qrcode.image.pil import PilImage
from backend.configuration.AppConfig import AppConfig, Stage
import io
import os
import logging
from backend.commons.enums.Stage import Stage

logger = logging.getLogger(__name__)

class QRCodeGenerator:

    def __init__(self, appConfig: AppConfig):
        self.appConfig = appConfig
        self.config = configparser.ConfigParser()
        self.config.read('backend/configuration/AppConfig.ini')
        
        # Dynamic frontend URL based on environment
        if appConfig.stage == Stage.PROD:
            # For production, use environment variable or default
            self.frontend_url = os.getenv("FRONTEND_URL", "https://yourdomain.com")
        else:
            # For development, use environment variable or default
            self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost")
            
        logger.info(f"QRCodeGenerator initialized with frontend URL: {self.frontend_url}")

    def generate(self, gameSessionId: str) -> str:
        # Generate URL with gameId parameter that can be used with the existing join functionality
        join_url = f"{self.frontend_url}/?gameId={gameSessionId}"
        
        img = qrcode.make(join_url)
        
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
