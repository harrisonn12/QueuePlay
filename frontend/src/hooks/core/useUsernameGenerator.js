import { useState } from 'react';
import { getApiBaseUrl } from '../../utils/api';

export const useUsernameGenerator = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);

    const generateUsername = async () => {
        setIsGenerating(true);
        setError(null);
        
        try {
            const response = await fetch(`${getApiBaseUrl()}/username/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });
            
            const data = await response.json();
            
            if (data.success && data.username) {
                return data.username;
            } else {
                setError(data.error || 'Failed to generate username');
                return null;
            }
        } catch (err) {
            setError('Connection error. Please try again.');
            console.error('Username generation error:', err);
            return null;
        } finally {
            setIsGenerating(false);
        }
    };

    return {
        generateUsername,
        isGenerating,
        error
    };
}; 