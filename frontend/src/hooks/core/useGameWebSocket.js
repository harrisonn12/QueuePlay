import { useEffect, useRef, useState, useCallback } from 'react';
import { getWebSocketUrl } from '../../utils/api/core.js';
import { getStoredToken } from '../../utils/api/auth.js';

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000; // Start with 1 second delay

/**
 * Custom hook to manage a WebSocket connection for the game.
 * Handles JWT authentication, connection, reconnection logic, and message routing.
 *
 * @param {string} gameId - Current game ID.
 * @param {string} clientId - Current client ID.
 * @param {string} role - Current role ('host' or 'player').
 * @param {function} onMessage - Callback function to handle incoming WebSocket messages.
 * @param {string} token - JWT token for authentication (required).
 * @returns {object} { socket: WebSocket | null, status: string, ensureConnected: function }
 */
export const useGameWebSocket = (gameId, clientId, role, onMessage, token = null) => {
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const [status, setStatus] = useState('Idle'); // Start as Idle

    // Keep track of authentication and identification state
    const authenticatedRef = useRef(false);
    const identifiedRef = useRef(false);

    // Ensure onMessage callback is always the latest version using a ref
    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    // Store connection details in refs to avoid triggering connect/disconnect effects
    const connectionDetailsRef = useRef({ gameId, clientId, role, token });
    useEffect(() => {
        connectionDetailsRef.current = { gameId, clientId, role, token };
    }, [gameId, clientId, role, token]);

    // Stable function to attempt connection if needed
    const ensureConnected = useCallback(() => {
        // *** GUARD ***: Do not attempt connection if essential details are missing
        const currentDetails = connectionDetailsRef.current;
        const currentToken = currentDetails.token || getStoredToken();
        
        console.log("ensureConnected: Checking connection requirements", {
            gameId: !!currentDetails.gameId,
            clientId: !!currentDetails.clientId,
            role: !!currentDetails.role,
            hasProvidedToken: !!currentDetails.token,
            hasStoredToken: !!getStoredToken(),
            finalToken: currentToken ? currentToken.substring(0, 20) + '...' : 'null'
        });
        
        if (!currentDetails.gameId || !currentDetails.clientId || !currentDetails.role || !currentToken) {
            console.warn("ensureConnected called, but essential details (gameId, clientId, role, token) are missing. Aborting connection attempt.", {
                ...currentDetails,
                hasToken: !!currentToken
            });
            // Set status to indicate waiting, perhaps?
            if (status !== 'Idle' && status !== 'Disconnected') setStatus('Waiting for authentication...');
            return null; // Indicate connection not ready
        }

        // If already open and ready, do nothing
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            return socketRef.current; // Return existing socket
        }
        // If connecting or closing, wait
        if (socketRef.current && 
            (socketRef.current.readyState === WebSocket.CONNECTING || 
             socketRef.current.readyState === WebSocket.CLOSING)) {
             console.log("WebSocket is currently connecting or closing. Please wait.");
            return null; // Indicate connection not ready
        }
        // If actively trying to reconnect via timer, wait for it
        if (reconnectTimeoutRef.current) {
            console.log("Reconnection timer active. Please wait.");
            return null; // Indicate connection not ready
        }

        console.log("(Re)Attempting WebSocket connection with JWT authentication...");
        setStatus('Connecting...');
        
        // Clear any previous socket refs just in case
        if (socketRef.current) {
             socketRef.current.close(1000, "Starting new connection attempt"); // Close cleanly
             socketRef.current = null;
        }
        
        // Clear authentication flags for new connection
        authenticatedRef.current = false;
        identifiedRef.current = false;

        // Use centralized WebSocket URL configuration
        const wsUrl = getWebSocketUrl();
        
        console.log(`Attempting WebSocket connection to: ${wsUrl}`);
        try {
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket; // Assign immediately 
            
            socket.onopen = () => {
                console.log("WebSocket connected successfully, authenticating...");
                reconnectAttemptsRef.current = 0;
                setStatus("Connected, authenticating...");
                
                // Send authentication immediately upon opening
                const authMessage = {
                    action: "authenticate",
                    token: currentToken
                };
                console.log("Sending WebSocket auth message:", { ...authMessage, token: currentToken ? currentToken.substring(0, 20) + '...' : 'null' });
                
                // Debug: Check token validity on frontend
                if (currentToken) {
                    try {
                        const tokenParts = currentToken.split('.');
                        if (tokenParts.length === 3) {
                            const payload = JSON.parse(atob(tokenParts[1]));
                            const now = Math.floor(Date.now() / 1000);
                            console.log("Token payload debug:", {
                                user_id: payload.user_id,
                                type: payload.type,
                                game_id: payload.game_id,
                                exp: payload.exp,
                                now: now,
                                isExpired: payload.exp < now,
                                expiresIn: payload.exp - now
                            });
                        }
                    } catch (e) {
                        console.error("Failed to decode token payload:", e);
                    }
                }
                
                socket.send(JSON.stringify(authMessage));
            };
            
            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("WebSocket received message:", data);
                    
                    // Handle authentication response
                    if (data.action === "authenticated" && data.success) {
                        console.log("WebSocket authentication successful");
                        authenticatedRef.current = true;
                        setStatus("Authenticated, identifying...");
                        
                        // Send identification after successful authentication
                        const { gameId: currentGameId, clientId: currentClientId, role: currentRole } = connectionDetailsRef.current;
                        const identifyMessage = {
                            action: "identify",
                            gameId: currentGameId,
                            clientId: currentClientId,
                            role: currentRole
                        };
                        console.log("Sending WebSocket identify message:", identifyMessage);
                        socket.send(JSON.stringify(identifyMessage));
                        return; // Don't pass authentication response to game logic
                    }
                    
                    // Handle identification response
                    if (data.action === "identified") {
                        console.log("WebSocket identification successful");
                        identifiedRef.current = true;
                        setStatus("Connected & Ready");
                        // Pass identification response to game logic
                    }
                    
                    // Handle authentication/identification errors
                    if (data.action === "error" && !authenticatedRef.current) {
                        console.error("WebSocket authentication/identification error:", data.message);
                        setStatus(`Auth Error: ${data.message}`);
                        socket.close();
                        return;
                    }
                    
                    // Pass all messages to game logic
                    if (onMessageRef.current) {
                        onMessageRef.current(data);
                    } else {
                        console.error("onMessage handler is not defined in useGameWebSocket");
                    }
                } catch (err) {
                    console.error("Error parsing WebSocket JSON", err);
                }
            };
            
            socket.onerror = (error) => {
                console.error("WebSocket error:", error);
                setStatus("WebSocket error");
                // Maybe try closing and letting onclose handle reconnect? 
                if (socketRef.current) { 
                    socketRef.current.close(); 
                }
            };
            
            socket.onclose = (event) => {
                console.log("WebSocket closed", event.code, event.reason);
                socketRef.current = null;
                authenticatedRef.current = false;
                identifiedRef.current = false;
                
                if (event.code === 4001) {
                    // Authentication failed, don't reconnect
                    setStatus("Authentication failed");
                    return;
                }
                
                // Reconnection logic
                if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                    const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current), 30000);
                    reconnectAttemptsRef.current++;
                    setStatus(`Reconnecting in ${delay/1000}s... (attempt ${reconnectAttemptsRef.current})`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectTimeoutRef.current = null;
                        ensureConnected();
                    }, delay);
                } else {
                    setStatus("Connection failed - max retries reached");
                }
            };
            
            return socket;
        } catch (error) {
            console.error("Error creating WebSocket:", error);
            setStatus("Error creating WebSocket connection");
            return null;
        }
    // Dependencies: empty array to avoid frequent re-creation
    }, [status]); 

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, []);

    return {
        socket: socketRef.current,
        status,
        ensureConnected,
        isAuthenticated: authenticatedRef.current,
        isIdentified: identifiedRef.current
    };
}; 