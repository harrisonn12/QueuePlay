# Refactoring Plan: True Host-Centric Architecture (v2)

This plan details the refactoring steps required to move towards a stricter host-centric architecture, addressing concerns about the current server's responsibilities and game logic bleed. The goal is a more decoupled, scalable, and game-agnostic backend infrastructure.

## 1. Core Concept & Goals

*   **Host Client as Game Authority:** The host client becomes the *sole* manager of game state and game-specific logic (e.g., question progression, scoring, timing).
*   **WebSocket Server (`MultiplayerServer.py`) as Pure Relay:** This server's only responsibility is managing WebSocket connections and relaying messages via `MessageService` (Redis Pub/Sub). It should be stateless regarding active games and completely game-agnostic.
*   **API Server (`main.py`) for Setup & Auxiliary Services:** The existing FastAPI application handles synchronous requests needed for game setup (e.g., creating lobbies, fetching initial game data like questions) and other non-real-time actions (e.g., payments).
*   **Decoupled Services:** Services like `LobbyService` and `QuestionService` interact primarily through the API Server or are used by the Host Client (via API calls), not directly injected into the WebSocket server.
*   **Game Agnosticism:** Adding new game types should only require changes to the client-side (Host and Player) and potentially adding new API endpoints if needed, *not* changes to the WebSocket server (`MultiplayerServer.py`, `ConnectionService.py`, `MessageService.py`).

## 2. Problem Areas Addressed

*   **`MultiplayerServer.py` Overload:** Currently initializes and holds references to multiple services (`LobbyService`, `QuestionService`, `ConnectionService`), making it stateful and coupled to specific implementations.
*   **`ConnectionService.py` Game Logic:** Handles game-specific actions (`startGame`, `submitAnswer`, `questionResult`, `resolveTie`, `finishGame`, getting questions) which belong on the Host Client.
*   **Game Logic Bleed:** Trivia game logic (question fetching via `QuestionService`) is embedded in the server's `startGame` flow.
*   **QR Code Generation:** Currently handled within `LobbyService` upon creation, tightly coupling it. Should likely be an API endpoint requested by the client.
*   **Server Scalability/Maintainability:** Tightly coupled services and embedded game logic make it harder to add new games or scale components independently.

## 3. Proposed Architecture Changes

### 3.1 Component Responsibilities (Refined)

*   **Host Client:**
    *   Initiates lobby creation via an API call to `main.py`.
    *   Requests QR code data via an API call to `main.py`.
    *   Connects to `MultiplayerServer.py` (WebSocket).
    *   Optionally requests initial game data (e.g., questions) via an API call to `main.py`.
    *   Manages the *entire* game lifecycle and state locally.
    *   Sends game state updates, questions, results, etc., to `MultiplayerServer.py` for broadcast to players.
    *   Receives player actions (e.g., answers, leave requests) relayed by `MultiplayerServer.py`.
    *   Handles player join/reconnect requests (relayed by server) by sending the current game state.
*   **WebSocket Server (`MultiplayerServer.py`):**
    *   **Dependencies:** Only `RedisAdapter` (for `MessageService`) and `MessageService`.
    *   **Responsibilities:**
        *   Accepts WebSocket connections.
        *   Uses `ConnectionService` (simplified) to manage connection lifecycle (connect, disconnect).
        *   Uses `MessageService` to subscribe/unsubscribe clients to appropriate Pub/Sub channels (`game:<id>:broadcast`, `game:<id>:to_host`).
        *   Relays messages between clients and Redis Pub/Sub based on channels without inspecting game content.
        *   Detects disconnections and triggers cleanup via `ConnectionService` / `MessageService`.
        *   **Does NOT initialize or interact with `LobbyService` or `QuestionService`.**
*   **`ConnectionService.py` (Simplified):**
    *   **Responsibilities:**
        *   Manages the `localConnections` dictionary (client_id -> websocket).
        *   Handles the raw `handleConnection` loop.
        *   Assigns temporary IDs.
        *   **Crucially, interprets only minimal, essential actions:**
            *   `identify` (or similar): Client provides its actual `client_id` and `game_id` to join appropriate channels. The service uses `MessageService` to subscribe.
            *   Relays all other messages to `MessageService` for publishing to the correct channel (`to_host` or `broadcast`).
        *   Handles disconnection cleanup (unsubscribing via `MessageService`, removing from `localConnections`).
        *   **Does NOT contain handlers for `initializeGame`, `joinGame`, `startGame`, `submitAnswer`, etc.**
*   **`MessageService.py`:**
    *   No major changes needed. Continues to manage Redis Pub/Sub subscriptions and message routing based on channels.
*   **API Server (`main.py` - FastAPI):**
    *   **Dependencies:** `LobbyService`, `QuestionService`, `PaymentService`, etc.
    *   **Responsibilities:**
        *   Handles HTTP requests.
        *   Endpoint `/createLobby`: Creates a lobby using `LobbyService`, returns `gameId`. (Host calls this).
        *   Endpoint `/getLobbyQRCode`: Generates QR code using `LobbyService` for a given `gameId`. (Host calls this after creating lobby).
        *   Endpoint `/getQuestions`: Provides question sets using `QuestionService`. (Host calls this when setting up the game).
        *   Other existing endpoints (Payments, etc.).
*   **`LobbyService.py`:**
    *   **Dependencies:** `RedisAdapter`, `QRCodeGenerator`.
    *   **Responsibilities:**
        *   Manages lobby state *only* in Redis (create, delete, add/remove players, get lobby info/players). Uses `RedisAdapter`.
        *   Provides lobby data to the API Server.
        *   `generateLobbyQRCode` remains but is called via the API server, not directly on lobby creation.
        *   **Does NOT interact with `MessageService` or `ConnectionService`.**
*   **`QuestionService.py`:**
    *   No changes needed. Provides questions via the API server.
*   **Player Client:**
    *   Connects to `MultiplayerServer.py` (WebSocket).
    *   Joins a game lobby (likely by sending an `identify` message with `gameId` after connecting).
    *   Receives all game state/updates from the WebSocket server (originated by Host).
    *   Sends actions (answers, leave requests) to the WebSocket server for relaying to the Host.
    *   Handles reconnection by requesting state from Host (via WebSocket relay).

### 3.2 Two Servers Clarification

The proposal aligns with the user's suggestion:
1.  **Message Broker/Relay Server:** `MultiplayerServer.py` + simplified `ConnectionService.py` + `MessageService.py`. Handles WebSockets and Pub/Sub relay.
2.  **Transactional/Setup Server:** `main.py` (FastAPI). Handles HTTP requests for lobby management, question fetching, payments, etc.

`ConnectionService` remains necessary within the WebSocket server to manage the connection lifecycle and basic identification/channel subscription, but it's stripped of all game logic.

## 4. Refactoring Steps

1.  **Modify `main.py` (API Server):**
    *   Ensure endpoints exist for `/createLobby`, `/getLobbyQRCode`, `/getQuestions`.
    *   Instantiate `LobbyService` and `QuestionService` here. Remove direct instantiation/use from `ConnectionService` and `MultiplayerServer`.
2.  **Modify `MultiplayerServer.py`:**
    *   Remove initialization of `LobbyService`, `QuestionService`, `QRCodeGenerator`, `ChatGptAdapter`.
    *   Only initialize `RedisAdapter`, `MessageService`, and `ConnectionService`.
    *   Inject only `MessageService` and `RedisAdapter` into `ConnectionService` during its initialization (remove `LobbyService` and `QuestionService` injection).
3.  **Refactor `ConnectionService.py`:**
    *   Remove `lobbyService` and `questionService` attributes and dependencies.
    *   Remove all action handlers related to game logic: `initializeGame`, `joinGame`, `startGame`, `submitAnswer`, `questionResult`, `nextQuestion`, `gameFinished`, `finishGame`, `resolveTie`, `leaveGame` (partially - see below).
    *   Implement a simple `identify` action handler (name TBD) where the client sends its `clientId` and `gameId`. This handler uses `MessageService.subscribe_client` to join the appropriate `broadcast` and potentially `to_host` channels. Handle re-association from `temp_client_id`.
    *   Modify the main message loop: after handling `identify`, all other messages are simply published via `messageService.publish_raw` to the appropriate channel (`game:<id>:to_host` for player messages, `game:<id>:broadcast` for host messages - role needs to be determined during `identify`).
    *   Modify disconnection logic (`finally` block): It should only be responsible for calling `messageService.unsubscribe_client_from_all` and removing the connection from `localConnections`. The *host client* will now be responsible for detecting player departures (via `playerLeft` messages relayed from other players' disconnects or specific `leaveGame` actions) and managing game state accordingly. The server *should* still detect *host* disconnections and notify players via a broadcast `gameEnded` message initiated *from the cleanup path* after `unsubscribe_client_from_all`.
    *   Modify `leaveGame` (if kept as a distinct action): This action would now *only* trigger the `unsubscribe_client_from_all`, remove the connection, and potentially publish a `playerLeft` message to the `to_host` channel. The host client receives this and updates the game state. If the host sends `leaveGame`, it triggers the host disconnect cleanup path.
4.  **Modify `LobbyService.py`:**
    *   Remove the `qrCodeGenerator` attribute if QR codes are generated solely via the API endpoint in `main.py`. Alternatively, keep it but ensure it's only used by the method called from `main.py`.
    *   Ensure it only interacts with `RedisAdapter`.
5.  **Refactor Frontend (`frontend/QueuePlay/`):**
    *   **Host Client:** Implement all game logic (state machine, timing, scoring, question progression). Call API endpoints (`/createLobby`, `/getLobbyQRCode`, `/getQuestions`). Handle WebSocket messages (`playerJoined`, `playerAnswer`, `playerLeft`) and update local game state. Broadcast game state updates via WebSocket.
    *   **Player Client:** Connect to WebSocket, send `identify` message. Send answers/actions via WebSocket. Receive and render game state updates from WebSocket.

## 5. Key Considerations & Trade-offs

*   **Pros:**
    *   **True Decoupling:** WebSocket server becomes a simple, scalable relay.
    *   **Game Agnostic Backend:** Easily add new game types without server changes.
    *   **Clear Responsibilities:** Strict separation between real-time relay and setup/auxiliary APIs.
    *   **Simplified Server:** Reduced complexity and state in the WebSocket server.
*   **Cons:**
    *   **Increased Host Complexity:** Host client becomes significantly more complex.
    *   **Host as Bottleneck/Failure Point:** Still reliant on the host's connection and processing power.
    *   **API Calls:** Host needs to make initial API calls for setup.
    *   **Potential Latency:** Game actions requiring server interaction (like getting questions mid-game, if designed that way) would involve an API call -> Host -> WebSocket broadcast round trip. (Mitigated by fetching needed data upfront).
*   **LobbyService Redis:** The service still manages lobby state in Redis, which is appropriate. The refactor focuses on *who* interacts with `LobbyService` (API server) rather than changing its core Redis usage for lobby data.

This refactoring aligns strongly with your goals, creating a much cleaner separation of concerns and preparing the backend to handle diverse game types efficiently.
