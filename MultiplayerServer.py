import asyncio
import websockets
import json
import uuid
from dotenv import load_dotenv

from backend.games.GameFactory import GameFactory
from backend.LobbyService.LobbyService import LobbyService
from backend.LobbyService.src.QRCodeGenerator import QRCodeGenerator
from backend.configuration.AppConfig import AppConfig
from backend.commons.enums.Stage import Stage

#need connections to pass as prop
#need games to keep track of all games
#actionHandlers for every handle method
games = {} #{gameId : gameInstance}
connections = {} # {clientId, websocket}, might need to scale this to a dict of dicts
actionHandlers = {} #{handlers...}

# Initialize services
app_config = AppConfig(Stage.DEVO)
qr_code_generator = QRCodeGenerator(app_config)
lobby_service = LobbyService(qr_code_generator)

#NOTES:
# Seperation of concerns
#     -only handles initializing game. every other handler calls the methods in each game by passing in props
#     -each game broadcasts message to every user
# can I add load_dotenv() in this file? so I don't have to add env key in every run
    

async def handleInitializeGame(data, websocket, clientId):
    """handle game initialization by host"""
    gameId = data.get("gameId", str(uuid.uuid4())) # checks dict for key gameId, if doesn't exist, create new gameId
    gameType = data.get("gameType", "trivia") # checks for gameType, if doesn't exist, default to trivia
    try:
        games[gameId] = GameFactory.createGame(gameType, gameId, clientId) #call GameFactory to create game
        
        # Generate QR code for the game session
        qr_code_data = lobby_service.generateLobbyQRCode(gameId)
        
        # send message to client side
        await websocket.send(json.dumps({  
                    "action": "gameInitialized", # handles action in client side
                    "gameId": gameId,
                    "clientId": clientId,
                    "role": "host",
                    "qrCodeData": qr_code_data
                }))
        print(f"{gameType} game {gameId} initialized by host {clientId}")
    except ValueError as e:
        await websocket.send(json.dumps({"action": "error", "message": str(e)}))

async def handleJoinGame(data, websocket, clientId):
    """handle game joining by player"""
    gameId = data.get("gameId")
    if gameId in games:
        await games[gameId].joinGame(clientId, websocket, connections) # game join handled in specific game
        print(f"Player {clientId} joined game {gameId}")
    else:
        await websocket.send(json.dumps({"action": "error", "message": "Game not found"}))

async def handleStartGame(data, websocket, clientId):
    """handle game start by host"""
    gameId = data.get("gameId")
    if gameId in games and games[gameId].hostId == clientId: # hostId is declared in BaseGame and GameFactory
        await games[gameId].startGame(connections) # game start handled in specific game
        print(f"Game {gameId} started by host {clientId}")
    else:
        await websocket.send(json.dumps({"action": "error", "message": "Cannot start game - not host or game not found"}))

async def handleSubmitAnswer(data, websocket, clientId):
    """handle answer submission by player"""
    #all the data is passed in from the client side
    gameId = data.get("gameId")
    questionIndex = data.get("questionIndex")
    answerIndex = data.get("answerIndex")

    if gameId in games and clientId in games[gameId].clients:
        await games[gameId].submitAnswer(clientId, questionIndex, answerIndex, connections) # submitAnswer handled in specific game
        print(f"Player {clientId} submitted answer {answerIndex} for question {questionIndex} in game {gameId}")
    else:
        await websocket.send(json.dumps({"action": "error", "message": "Cannot submit answer - game not found or not a player"}))

async def handleNextQuestion(data, websocket, clientId):
    gameId = data.get("gameId")
    if gameId in games and games[gameId].hostId == clientId: # hostId is declared in BaseGame and GameFactory
        await games[gameId].nextQuestion(connections)  # nextQuestion handled in specific game
        print(f"Moving to next question in game {gameId}")
    else:
        await websocket.send(json.dumps({"action": "error", "message": "Cannot advance question - not host or game not found"}))


actionHandlers["initializeGame"] = handleInitializeGame
actionHandlers["joinGame"] = handleJoinGame
actionHandlers["startGame"] = handleStartGame
actionHandlers["submitAnswer"] = handleSubmitAnswer
actionHandlers["nextQuestion"] = handleNextQuestion


async def handler(websocket):
    clientId = None
    try:
        async for message in websocket:
            data = json.loads(message) # every message sent from client should include clientId
            clientId = data.get("clientId", str(uuid.uuid4()))
            connections[clientId] = websocket;
            
            action = data.get("action")  # Extract the action from the message
            if action in actionHandlers:
                await actionHandlers[action](data, websocket, clientId)
            else:
                await websocket.send(json.dumps({"action": "error", "message": "Unknown action"}))
    except websockets.exceptions.ConnectionClosed:
        print(f"Client {clientId} disconnected")
    finally:
        if clientId in connections:
            print(f"Removing Client {clientId}")
            del connections[clientId]

async def main():
    async with websockets.serve(handler, "localhost", 6789):
        print("WebSocket server started on ws://localhost:6789")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    load_dotenv()
    asyncio.run(main())
