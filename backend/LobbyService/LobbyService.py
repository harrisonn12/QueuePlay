from backend.LobbyService.src.QRCodeGenerator import QRCodeGenerator


class LobbyService:

    def __init__(self, qrCodeGenerator: QRCodeGenerator):
        self.qrCodeGenerator = qrCodeGenerator

    def generateLobbyQRCode(self, gameSessionId: str) -> str:
        return self.qrCodeGenerator.generate(gameSessionId)
