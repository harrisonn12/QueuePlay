import asyncio
import websockets
from dotenv import load_dotenv
from backend.ConnectionService.ConnectionService import ConnectionService

async def main():
    connectionService = ConnectionService()
    async with websockets.serve(connectionService.handleConnection, "localhost", 6789):
        print("WebSocket server started on ws://localhost:6789")
        await asyncio.Future()  # run forever
    
if __name__ == "__main__":
    load_dotenv()
    asyncio.run(main())
