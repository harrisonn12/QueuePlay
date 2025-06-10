// Re-export core API functions for backward compatibility
export { getApiBaseUrl, getWebSocketUrl, apiRequest, authenticatedApiRequest } from './api/core.js';

// Import core functions for use in this file
import { apiRequest, authenticatedApiRequest } from './api/core.js';

// Specific API functions using the core utilities

// Helper function to get guest token for players
export const getGuestToken = async (gameId, playerName = null, phoneNumber = null) => {
    try {
        const requestBody = {
            game_id: gameId,
            player_name: playerName,
            phone_number: phoneNumber
        };
        
        console.log('Getting guest token with request body:', requestBody);
        
        const response = await apiRequest('/auth/guest-token', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });
        
        return response;
    } catch (error) {
        console.error('Failed to get guest token:', error);
        
        // Try to get more error details if available
        if (error.response) {
            console.error('Guest token error response:', error.response);
        }
        
        throw error;
    }
};

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

// Helper function to submit answer with authentication
export const submitAnswerWithAuth = async (gameId, questionIndex, answerIndex, token) => {
    try {
        const response = await authenticatedApiRequest('/submitAnswer', {
            method: 'POST',
            body: JSON.stringify({
                game_id: gameId,
                question_index: questionIndex,
                answer_index: answerIndex
            })
        }, token);
        
        return response;
    } catch (error) {
        console.error('Failed to submit answer:', error);
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

// Token storage helpers
export const storeToken = (token, expiresIn = null) => {
    localStorage.setItem('jwt_token', token);
    if (expiresIn) {
        const expiryTime = Date.now() + (expiresIn * 1000);
        localStorage.setItem('jwt_expiry', expiryTime.toString());
    }
};

export const getStoredToken = () => {
    const token = localStorage.getItem('jwt_token');
    const expiry = localStorage.getItem('jwt_expiry');
    
    if (token && expiry) {
        if (Date.now() < parseInt(expiry)) {
            return token;
        } else {
            // Token expired, clean up
            clearStoredToken();
            return null;
        }
    }
    
    return token; // Return token even if no expiry info
};

export const clearStoredToken = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('jwt_expiry');
    localStorage.removeItem('guest_user_id');
};

export const storeGuestInfo = (userId) => {
    localStorage.setItem('guest_user_id', userId);
};

export const getGuestUserId = () => {
    return localStorage.getItem('guest_user_id');
}; 