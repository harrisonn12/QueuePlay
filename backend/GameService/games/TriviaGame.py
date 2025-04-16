from backend.GameService.games.BaseGame import BaseGame
import json
import asyncio
import logging
from backend.QuestionService.QuestionService import QuestionService

logger = logging.getLogger(__name__)

class TriviaGame(BaseGame):
    def __init__(self, gameId, hostId, questionService, gameStateManager=None):
        super().__init__(gameId, hostId, gameStateManager)
        self.questionService = questionService
    
    async def startGame(self, sendToClient):
        """Start the trivia game with questions"""
        numQuestions = 5
        questionSet = self.questionService.getQuestionAnswerSet(numQuestions)
        
        if not questionSet or "questions" not in questionSet:
            logger.error(f"Failed to retrieve questions for game {self.gameId}")
            await sendToClient(self.hostId, {
                "action": "error",
                "message": "Failed to retrieve questions"
            })
            return
        
        # Reset game state and initialize
        self.gameState.reset()
        self.gameState.questions = questionSet["questions"]
        self.gameState.active = True
        self.gameState.initializeScores(self.clients)
        
        # Save game state to Redis
        await self.saveState()
        
        logger.info(f"Game {self.gameId} started with {len(self.gameState.questions)} questions")
        
        # Send game started message to all clients
        await self.broadcast({
            "action": "gameStarted",
            "questions": self.gameState.questions,
        }, sendToClient)
    
    async def submitAnswer(self, clientId, questionIndex, answerIndex, sendToClient):
        """Handle a player submitting an answer"""
        if not self.gameState.active:
            logger.warning(f"Attempt to submit answer for inactive game {self.gameId}")
            return
        
        logger.info(f"Player {clientId} submitted answer {answerIndex} for question {questionIndex} in game {self.gameId}")
        
        # Record the answer
        self.gameState.addPlayerAnswer(questionIndex, clientId, answerIndex)
        
        # Save updated state
        await self.saveState()
        
        # Send confirmation to the player
        await sendToClient(clientId, {
            "action": "answerSubmitted",
            "questionIndex": questionIndex
        })
        
        # Notify the host
        await sendToClient(self.hostId, {
            "action": "playerAnswered",
            "clientId": clientId,
            "questionIndex": questionIndex
        })
    
    async def calculateAndSendScores(self, questionIndex, sendToClient):
        """Calculate scores for a question and send results"""
        if questionIndex < len(self.gameState.questions):
            correctAnswer = self.gameState.questions[questionIndex].get("answerIndex")
            playerAnswers = self.gameState.playerAnswers.get(questionIndex, {})
            
            for clientId, answerIndex in playerAnswers.items():
                if answerIndex == correctAnswer:
                    self.gameState.updateScore(clientId, 1)
                    logger.debug(f"Player {clientId} answered correctly. New score: {self.gameState.scores.get(clientId)}")
                else:
                    logger.debug(f"Player {clientId} answered incorrectly ({answerIndex})")
            
            # Save updated state
            await self.saveState()
            
            logger.info(f"Scores calculated for question {questionIndex} in game {self.gameId}")
            
            # Broadcast results to all players
            await self.broadcast({
                "action": "questionResult",
                "scores": self.gameState.scores
            }, sendToClient)
    
    async def nextQuestion(self, sendToClient):
        """Move to the next question"""
        if not self.gameState.active:
            logger.warning(f"Attempt to advance inactive game {self.gameId}")
            return
        
        currentIndex = self.gameState.currentQuestionIndex
        logger.info(f"Moving from question {currentIndex} to next in game {self.gameId}")
        
        # Calculate and send scores for the current question
        await self.calculateAndSendScores(currentIndex, sendToClient)
        
        # Move to the next question if available
        if self.gameState.moveToNextQuestion():
            logger.info(f"Moving to question {self.gameState.currentQuestionIndex} in game {self.gameId}")
            
            # Save updated state
            await self.saveState()
            
            # Notify all clients of the next question
            await self.broadcast({
                "action": "nextQuestion",
                "questionIndex": self.gameState.currentQuestionIndex,
            }, sendToClient)
        else:
            # End the game if no more questions
            logger.info(f"No more questions, ending game {self.gameId}")
            self.gameState.active = False
            
            # Save updated state
            await self.saveState()
            
            # Notify all clients that the game is finished
            await self.broadcast({
                "action": "gameFinished",
                "finalScores": self.gameState.scores
            }, sendToClient)