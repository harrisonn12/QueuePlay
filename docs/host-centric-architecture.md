# Host-Centric Architecture Plan

This document outlines the proposed architecture shifting game state management from the server to the host client, prioritizing player reconnection resilience while accepting simpler host failure handling.
 
## 1. Core Concept

*   The **Host Client** becomes the single source of truth for the `GameState`.
*   The **Server** acts primarily as a message broker/relay between the Host and Player Clients. It handles connections and lobbies but does not manage live game state.
*   **Player Clients** interact solely through the server, sending inputs and receiving state updates originating from the host.
* The **Redis** will act as a pub/sub model, not as a storage/cache. 

## 2. Component Responsibilities

*   **Host Client:**
    *   Initializes the game (potentially fetching initial data like questions from a server service).
    *   Holds the complete `GameState` object in its memory.
    *   Runs the game logic (e.g., starts timers, advances questions, calculates scores based on player inputs).
    *   Sends state updates (current question, scores, timer) to the server for broadcasting to players.
    *   Receives player inputs (answers) relayed by the server.
    *   Handles player reconnection requests by sending them the current `GameState` (relayed via the server).
*   **Server:**
    *   Manages WebSocket connections for all clients (Host and Players).
    *   Relays messages:
        *   Host -> Players (Game state updates, questions, etc.)
        *   Players -> Host (Answers, join requests, state requests on reconnect)
    *   Authenticates/Validates messages (optional, basic checks).
    *   Manages game lobbies/discovery.
    *   **Detects host disconnection (e.g., WebSocket closure, missed heartbeats).**
    *   **Sends a "Game Ended (Host Disconnected)" message to all players in that game upon host disconnection.**
    *   *Does not* store or manage the active `GameState`. 
*   **Player Client:**
    *   Connects to the server.
    *   Joins a specific game lobby.
    *   Receives game state updates from the server (originating from the Host).
    *   Sends inputs (answers) to the server to be relayed to the Host.
    *   If disconnected, reconnects and requests the current state from the Host (via the server).
    *   **Handles the "Game Ended (Host Disconnected)" message from the server.**



## 4. Host Disconnection Handling Strategy

*   **Strategy Adopted:** Strategy 1 - Graceful Game Termination.
*   **Mechanism:** The server detects the host's disconnection. It immediately sends a message to all connected players in that game informing them that the host has left and the game cannot continue. The game ends.
*   **Rationale:** Chosen for simplicity in the initial implementation phase.

## 5. Key Considerations & Trade-offs

*   **Pros:**
    *   Improved player reconnection *if the host remains stable*.
    *   Reduced server load and complexity (no state management).
    *   Simple handling of host failure (game terminates clearly).
*   **Cons:**
    *   Host is a critical single point of failure; game ends if host disconnects.
    *   Host client requires more resources and complexity.
    *   Potential for cheating if host client is compromised (requires careful design).
    *   Scalability limited by host capabilities.

## 6. Resilience & Fault Tolerance Plan

### 6.1 Periodic Database Snapshots
- After each significant game state change (e.g., question advance, score update), or on a short timer (e.g., every 5–10s), the host writes a complete snapshot of `GameState` to a durable database (e.g., PostgreSQL, MongoDB).
- Snapshots include a Time-To-Live (TTL) or background cleanup to automatically remove old game records once they are no longer needed.

### 6.2 Redis for Pub/Sub with Sentinel
- Redis is used solely as the real-time message bus (pub/sub) for host ↔ player communication.
- **Deploy under Redis Sentinel**:
  - Sentinel monitors a Redis master + one or more replicas.
  - On master failure, Sentinel promotes a replica and updates client connections.
  - Client libraries with Sentinel support will transparently reconnect to the new master.
- **Why Sentinel over Cluster**:
  - Pub/Sub works seamlessly with Sentinel; Redis Cluster has known limitations for Pub/Sub.
  - Your game state size is modest and doesn't require sharding.
  - Sentinel offers high availability with minimal added complexity.