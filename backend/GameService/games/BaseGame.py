import json
import asyncio

class BaseGame:
    def __init__(self, gameId, hostId):
        self.gameId = gameId
        self.hostId = hostId
        self.clients = {hostId: "host"}
    
    async def joinGame(self, clientId, websocket, connections):
        self.clients[clientId] = "player" # default role
        connections[clientId] = websocket # connect the clientId to the websocket
        await websocket.send(json.dumps({ # send message to client side, player side
                    "action": "gameJoined",
                    "gameId": self.gameId,
                    "clientId": clientId,
                    "role" : "player"
                }))
        await self.broadcast(json.dumps({ # send message to client side, host side
                    "action": "playerJoined",
                    "clientId": clientId
                }), connections)
   
    async def broadcast(self, message, connections): 
        """only broadcast to clients in the specfic game because self.clients scoped within current game"""
        connectionsList = []
        for client in self.clients:
            if client in connections:
                connectionsList.append(connections[client])
        if connectionsList:
            await asyncio.gather(
                *[connection.send(message) for connection in connectionsList],
                return_exceptions=True)    

    