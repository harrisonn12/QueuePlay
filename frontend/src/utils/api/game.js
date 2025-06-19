import { authenticatedApiRequest, apiRequest } from './core.js';

// Helper function to join game with authentication
export const joinGameWithAuth = async (gameId, playerName, phoneNumber = null, token) => {
    try {
        const response = await authenticatedApiRequest('/joinGame', {
            method: 'POST',
            body: JSON.stringify({
                game_id: gameId,
                player_name: playerName,
                phone_number: phoneNumber
            })
        }, token);
        
        return response;
    } catch (error) {
        console.error('Failed to join game:', error);
        throw error;
    }
};

// Helper function to leave game with authentication
export const leaveGameWithAuth = async (gameId, token) => {
    try {
        const response = await authenticatedApiRequest('/leaveGame', {
            method: 'POST',
            body: JSON.stringify({
                game_id: gameId
            })
        }, token);
        
        return response;
    } catch (error) {
        console.error('Failed to leave game:', error);
        throw error;
    }
};

// Generic function to create a lobby for any game type
export const createLobby = async (clientId, gameType, token, hostId = null) => {
    try {
        // Extract hostId from JWT token if not provided
        let actualHostId = hostId;
        if (!actualHostId && token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                actualHostId = payload.user_id || 'host';
            } catch (e) {
                console.warn('Could not extract hostId from token, using clientId as fallback');
                actualHostId = clientId;
            }
        }
        
        const requestBody = {
            gameType: gameType,
            hostId: actualHostId
        };
        console.log('Creating lobby with request body:', requestBody);
        
        const response = await authenticatedApiRequest('/createLobby', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        }, token);
        
        console.log('Backend createLobby response:', response);
        
        if (response.error) {
            throw new Error(response.error);
        }
        
        if (!response.gameId) {
            console.error('Backend returned success but no gameId:', response);
            throw new Error('Backend did not return a gameId');
        }
        
        return response.gameId;
    } catch (error) {
        console.error('Failed to create lobby:', error);
        throw error;
    }
};

// Get lobby information (game type, host, etc.) - public endpoint
export const getLobbyInfo = async (gameId) => {
    try {
        const response = await apiRequest(`/getLobbyInfo?gameId=${gameId}`, {
            method: 'GET'
        });
        
        return response;
    } catch (error) {
        console.error('Failed to get lobby info:', error);
        throw error;
    }
};

// Generic function to get QR code for any game
export const getQrCode = async (gameId, token) => {
    try {
        const response = await authenticatedApiRequest(`/getLobbyQRCode?gameId=${gameId}`, {
            method: 'GET'
        }, token);
        
        return response.qrCodeData;
    } catch (error) {
        console.error('Failed to get QR code:', error);
        throw error;
    }
}; 