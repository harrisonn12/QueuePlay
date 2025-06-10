import { apiRequest } from './core.js';

// Helper function to get guest token for players
export const getGuestToken = async (gameId, playerName = null, phoneNumber = null) => {
    try {
        const response = await apiRequest('/auth/guest-token', {
            method: 'POST',
            body: JSON.stringify({
                game_id: gameId,
                player_name: playerName,
                phone_number: phoneNumber
            })
        });
        
        return response;
    } catch (error) {
        console.error('Failed to get guest token:', error);
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