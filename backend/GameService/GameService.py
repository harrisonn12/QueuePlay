import json
import uuid
from backend.GameService.games.GameFactory import GameFactory
from backend.LobbyService.LobbyService import LobbyService
from backend.LobbyService.src.QRCodeGenerator import QRCodeGenerator
from backend.configuration.AppConfig import AppConfig
from backend.commons.enums.Stage import Stage

class GameService:
    def __init__(self):
        self.games = {}
        self.appConfig = AppConfig(Stage.DEVO)
        self.qrCodeGenerator = QRCodeGenerator(self.appConfig)
        self.lobbyService = LobbyService(self.qrCodeGenerator)
        self.gameFactory = GameFactory()

    async def initializeGame(self, data, websocket, clientId, connections):
        gameId = data.get("gameId", str(uuid.uuid4()))
        gameType = data.get("gameType", "trivia")
        try:
            self.games[gameId] = self.gameFactory.createGame(gameType, gameId, clientId)
            qrCodeData = self.lobbyService.generateLobbyQRCode(gameId)
            
            await websocket.send(json.dumps({
                "action": "gameInitialized",
                "gameId": gameId,
                "clientId": clientId,
                "role": "host",
                "qrCodeData": qrCodeData
            }))
            print(f"{gameType} game {gameId} initialized by host {clientId}")
        except ValueError as e:
            await websocket.send(json.dumps({"action": "error", "message": str(e)}))

    async def joinGame(self, data, websocket, clientId, connections):
        gameId = data.get("gameId")
        if gameId in self.games:
            await self.games[gameId].joinGame(clientId, websocket, connections)
            print(f"Player {clientId} joined game {gameId}")
        else:
            await websocket.send(json.dumps({"action": "error", "message": "Game not found"}))

    async def startGame(self, data, websocket, clientId, connections):
        gameId = data.get("gameId")
        if gameId in self.games and self.games[gameId].hostId == clientId:
            await self.games[gameId].startGame(connections)
            print(f"Game {gameId} started by host {clientId}")
        else:
            await websocket.send(json.dumps({"action": "error", "message": "Cannot start game - not host or game not found"}))

    async def submitAnswer(self, data, websocket, clientId, connections):
        gameId = data.get("gameId")
        questionIndex = data.get("questionIndex")
        answerIndex = data.get("answerIndex")

        if gameId in self.games and clientId in self.games[gameId].clients:
            await self.games[gameId].submitAnswer(clientId, questionIndex, answerIndex, connections)
            print(f"Player {clientId} submitted answer {answerIndex} for question {questionIndex} in game {gameId}")
        else:
            await websocket.send(json.dumps({"action": "error", "message": "Cannot submit answer - game not found or not a player"}))

    async def nextQuestion(self, data, websocket, clientId, connections):
        gameId = data.get("gameId")
        if gameId in self.games and self.games[gameId].hostId == clientId:
            await self.games[gameId].nextQuestion(connections)
            print(f"Moving to next question in game {gameId}")
        else:
            await websocket.send(json.dumps({"action": "error", "message": "Cannot advance question - not host or game not found"})) 