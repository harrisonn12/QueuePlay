import { useEffect, useRef, useState, useCallback } from 'react';

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000; // Start with 1 second delay

/**
 * Custom hook to manage a WebSocket connection for the game.
 * Handles connection, reconnection logic, and message routing.
 *
 * @param {string} gameId - Current game ID.
 * @param {string} clientId - Current client ID.
 * @param {string} role - Current role ('host' or 'player').
 * @param {function} onMessage - Callback function to handle incoming WebSocket messages.
 * @returns {object} { socket: WebSocket | null, status: string, ensureConnected: function }
 */
export const useGameWebSocket = (gameId, clientId, role, onMessage) => {
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const [status, setStatus] = useState('Idle'); // Start as Idle

    // Keep track of whether identification has been sent for this connection
    const identifiedRef = useRef(false);

    // Ensure onMessage callback is always the latest version using a ref
    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    // Store connection details in refs to avoid triggering connect/disconnect effects
    const connectionDetailsRef = useRef({ gameId, clientId, role });
    useEffect(() => {
        connectionDetailsRef.current = { gameId, clientId, role };
    }, [gameId, clientId, role]);

    // Stable function to attempt connection if needed
    const ensureConnected = useCallback(() => {
        // *** GUARD ***: Do not attempt connection if essential details are missing
        const currentDetails = connectionDetailsRef.current;
        if (!currentDetails.gameId || !currentDetails.clientId || !currentDetails.role) {
            console.warn("ensureConnected called, but essential details (gameId, clientId, role) are missing. Aborting connection attempt.", currentDetails);
            // Set status to indicate waiting, perhaps?
            if (status !== 'Idle' && status !== 'Disconnected') setStatus('Waiting for game details...');
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

        console.log("(Re)Attempting WebSocket connection...");
        setStatus('Connecting...');
        
        // Clear any previous socket refs just in case
        if (socketRef.current) {
             socketRef.current.close(1000, "Starting new connection attempt"); // Close cleanly
             socketRef.current = null;
        }
        
        // Clear identified flag for new connection
        identifiedRef.current = false;

        // Use window location for dynamic WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port; // Use the same port as the current page
        
        // Construct URL to go through edge load balancer (/ws/ route)
        const wsUrl = port ? 
            `${protocol}//${host}:${port}/ws/` :  // For dev: ws://localhost:80/ws/
            `${protocol}//${host}/ws/`;           // For prod: wss://yourdomain.com/ws/
        
        console.log(`Attempting WebSocket connection to: ${wsUrl}`);
        try {
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket; // Assign immediately 
            
            socket.onopen = () => {
                console.log("WebSocket connected successfully");
                reconnectAttemptsRef.current = 0;
                setStatus("Connected, attempting identification...");
                // Attempt to identify immediately upon opening
                // Identification logic is now handled by the useEffect below
            };
            
            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
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
                const wasClean = event.wasClean;
                const code = event.code;

                // Reset identified flag on close
                identifiedRef.current = false; 

                console.log(`WebSocket disconnected. Clean: ${wasClean}, Code: ${code}, Reason: ${event.reason}`);
                // Only clear ref if it's the socket that just closed
                if(socketRef.current === socket) {
                    socketRef.current = null; 
                }
                
                // Reconnection logic (same as before)
                if (!wasClean && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttemptsRef.current++;
                    const delay = Math.min(
                        BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current -1), // More standard exponential backoff
                        30000 // Max 30 second delay
                    );
                    setStatus(`Connection lost. Reconnecting...`);
                    console.log(`Scheduling reconnect attempt ${reconnectAttemptsRef.current} in ${delay}ms`);
                    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectTimeoutRef.current = null;
                        ensureConnected(); // Call ensureConnected for reconnect attempt
                    }, delay);
                } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                    setStatus("Failed to reconnect.");
                } else {
                    setStatus("Disconnected"); // Use simpler status
                }
            };
            
            return socket; // Return the newly creating socket
        } catch (error) {
            console.error("Error creating WebSocket:", error);
            setStatus("Error creating WebSocket connection");
            return null;
        }
    // Dependencies: onMessageRef is stable. We don't want this function 
    // itself to change reference frequently.
    }, []); // Add status to dependency array to re-evaluate guard if status changes

    // Effect to send Identify message when connection is open and details are available
    useEffect(() => {
        const ws = socketRef.current;
        const { gameId, clientId, role } = connectionDetailsRef.current;

        if (ws && ws.readyState === WebSocket.OPEN && !identifiedRef.current) {
            console.log("[Identify Effect] Checking conditions:", 
                { 
                    isSocketOpen: ws?.readyState === WebSocket.OPEN, 
                    isIdentified: identifiedRef.current, 
                    gameId, clientId, role 
                }
            );
            if (gameId && clientId && role) {
                console.log(`WebSocket open. Sending identify... Game: ${gameId}, Client: ${clientId}, Role: ${role}`);
                setStatus("Identifying...");
                ws.send(JSON.stringify({
                    action: "identify",
                    gameId: gameId,
                    clientId: clientId,
                    role: role
                }));
                identifiedRef.current = true; // Mark as identified for this connection
            } else {
                console.log("WebSocket open, but missing details for identification.", { gameId, clientId, role });
                // Optionally set status to indicate waiting for details?
                // setStatus("Connected, waiting for game details...");
            }
        }
    // Depend on status (to catch the 'Connected...' state) and the details
    }, [status, gameId, clientId, role]); 

    // Cleanup function on unmount
    useEffect(() => {
        return () => {
            console.log("Cleaning up WebSocket connection (on unmount)...");
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            const ws = socketRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
                console.log("Closing WebSocket connection.");
                ws.close(1000, "Client unmounting");
            }
            socketRef.current = null;
        };
    }, []); // Empty dependency array ensures this runs only on unmount

    // Expose the current socket status and the connection function
    // We return socketRef.current directly so the consuming component gets the live value
    return { socket: socketRef.current, status, ensureConnected }; // Expose ensureConnected
}; 