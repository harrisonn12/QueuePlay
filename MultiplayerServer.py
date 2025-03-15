# server.py
import asyncio
import websockets

# Set of connected clients
connected_clients = set()

async def broadcast(message):
    if connected_clients:  # only send if there are any connected clients
        await asyncio.gather(
            *[client.send(message) for client in connected_clients],
            return_exceptions=True  # optional: handles exceptions for individual sends
        )

async def handler(websocket):
    # Register new client
    connected_clients.add(websocket)
    print("number of clients {}".format(len(connected_clients)))
    try:
        async for message in websocket:
            # Broadcast the received message to all connected clients
            await broadcast(message)
    except websockets.exceptions.ConnectionClosed:
        print("client disconnected")
    finally:
        # Unregister client
        print("removing client")
        connected_clients.remove(websocket)
        print("number of clients {}".format(len(connected_clients)))

async def main():
    async with websockets.serve(handler, "localhost", 6789):
        print("WebSocket server started on ws://localhost:6789")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    connected_clients = set()
    asyncio.run(main())
