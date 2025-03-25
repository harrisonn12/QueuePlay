const QuestionService = {
    async getQuestionAnswerSet() {
        try {
            const response = await fetch('/api/getQuestionAnswerSet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // when HTTP communicating, usually JSON object
                }
            });
            if (!response.ok) {
                throw new Error('Request failed with status:', response.status);
            }
            return await response.json();

        } catch (error) {
            console.error('Error fetching question answer set:', error);
            throw error;
        }
    }
};

export default QuestionService;