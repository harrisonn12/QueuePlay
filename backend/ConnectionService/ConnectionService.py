import json
import uuid
import websockets
from backend.GameService.GameService import GameService

class ConnectionService:
    def __init__(self):
        self.connections = {}
        self.gameService = GameService()
        self.actionHandlers = {
            "initializeGame": self.gameService.initializeGame,
            "joinGame": self.gameService.joinGame,
            "startGame": self.gameService.startGame,
            "submitAnswer": self.gameService.submitAnswer,
            "nextQuestion": self.gameService.nextQuestion
        }

    async def handleConnection(self, websocket):
        clientId = None
        try:
            async for message in websocket:
                data = json.loads(message)
                clientId = data.get("clientId", str(uuid.uuid4()))
                self.connections[clientId] = websocket
                
                action = data.get("action")
                if action in self.actionHandlers:
                    await self.actionHandlers[action](data, websocket, clientId, self.connections)
                else:
                    await websocket.send(json.dumps({"action": "error", "message": "Unknown action"}))
        except websockets.exceptions.ConnectionClosed:
            print(f"Client {clientId} disconnected")
        finally:
            if clientId in self.connections:
                print(f"Removing Client {clientId}")
                del self.connections[clientId] 