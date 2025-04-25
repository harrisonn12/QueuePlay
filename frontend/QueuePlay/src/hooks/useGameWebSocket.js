import { useEffect, useRef, useState, useCallback } from 'react';

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000; // Start with 1 second delay

/**
 * Custom hook to manage a WebSocket connection for the game.
 * Handles connection, reconnection logic, and message routing.
 *
 * @param {string} initialGameId - Initial game ID if known (for reconnect).
 * @param {string} initialClientId - Initial client ID if known (for reconnect).
 * @param {string} initialRole - Initial role if known (for reconnect).
 * @param {function} onMessage - Callback function to handle incoming WebSocket messages.
 * @returns {object} { socket: WebSocket | null, status: string, ensureConnected: function }
 */
export const useGameWebSocket = (initialGameId, initialClientId, initialRole, onMessage) => {
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const [status, setStatus] = useState('Initializing...'); // Start as Initializing

    // Ensure onMessage callback is always the latest version using a ref
    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    // Stable function to attempt connection if needed
    const ensureConnected = useCallback(() => {
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
             // Remove old listeners if possible? Generally not needed as we create a new object.
             socketRef.current = null;
        }
        
        // Use window location for dynamic WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        // Default WebSocket port
        const port = '6789';
        const wsUrl = `${protocol}//${host}:${port}/`;
        
        console.log(`Attempting WebSocket connection to: ${wsUrl}`);
        try {
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket; // Assign immediately 
            
            socket.onopen = () => {
                console.log("WebSocket connected successfully");
                reconnectAttemptsRef.current = 0;
                setStatus("WebSocket connected");
                // NO automatic reconnect message sending here anymore
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
                    setStatus("Disconnected.");
                }
            };
            
            return socket; // Return the newly created socket
        } catch (error) {
            console.error("Error creating WebSocket:", error);
            setStatus("Error creating WebSocket connection");
            return null;
        }
    // Dependencies: onMessageRef is stable. We don't want this function 
    // itself to change reference frequently.
    }, []); 

    // Effect to establish the initial connection ONCE
    useEffect(() => {
        ensureConnected();

        // Cleanup function
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only on mount

    // Expose the current socket status and the connection function
    // We return socketRef.current directly so the consuming component gets the live value
    return { socket: socketRef.current, status, ensureConnected }; // Expose ensureConnected
}; 