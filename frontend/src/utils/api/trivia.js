import { authenticatedApiRequest } from './core.js';

// Helper function to submit answer with authentication
export const submitAnswerWithAuth = async (gameId, questionIndex, answerIndex, token) => {
    try {
        const response = await authenticatedApiRequest('/submitAnswer', {
            method: 'POST',
            body: JSON.stringify({
                gameId: gameId,
                questionIndex: questionIndex,
                answerIndex: answerIndex
            })
        }, token);
        
        return response;
    } catch (error) {
        console.error('Failed to submit answer:', error);
        throw error;
    }
};

// Function to get trivia questions for a game
export const getQuestions = async (gameId, token) => {
    try {
        const response = await authenticatedApiRequest(`/getQuestions?gameId=${gameId}`, {
            method: 'GET'
        }, token);
        
        return response.questions;
    } catch (error) {
        console.error('Failed to get questions:', error);
        throw error;
    }
}; 