import json
import time

class GameState:
    def __init__(self, gameId=None, hostId=None):
        self.gameId = gameId
        self.hostId = hostId  # Store the host ID in the game state
        self.active = False
        self.questions = []
        self.currentQuestionIndex = 0
        self.playerAnswers = {}  # {questionIndex: {clientId: answerIndex}}
        self.scores = {}  # {clientId: score}
        self.createdAt = int(time.time())
        self.updatedAt = int(time.time())
    
    def reset(self):
        """Reset the game state to initial values"""
        self.active = False
        self.questions = []
        self.currentQuestionIndex = 0
        self.playerAnswers = {}
        self.scores = {}
        self.updatedAt = int(time.time())
    
    def initializeScores(self, clients):
        """Initialize scores for all players"""
        self.scores = {client: 0 for client in clients if clients[client] == "player"}
        self.updatedAt = int(time.time())
    
    def addPlayerAnswer(self, questionIndex, clientId, answerIndex):
        """Add a player's answer for a specific question"""
        if questionIndex not in self.playerAnswers:
            self.playerAnswers[questionIndex] = {}
        self.playerAnswers[questionIndex][clientId] = answerIndex
        self.updatedAt = int(time.time())
    
    def updateScore(self, clientId, points):
        """Update a player's score"""
        if clientId not in self.scores:
            self.scores[clientId] = 0
        self.scores[clientId] += points
        self.updatedAt = int(time.time())
    
    def getCurrentQuestion(self):
        """Get the current question"""
        if self.currentQuestionIndex < len(self.questions):
            return self.questions[self.currentQuestionIndex]
        return None
    
    def moveToNextQuestion(self):
        """Move to the next question"""
        self.currentQuestionIndex += 1
        self.updatedAt = int(time.time())
        return self.currentQuestionIndex < len(self.questions)
    
    def toDict(self):
        """Convert GameState object to dictionary for Redis storage"""
        return {
            "gameId": self.gameId,
            "hostId": self.hostId,  # Include hostId in serialization
            "active": self.active,
            "questions": self.questions,
            "currentQuestionIndex": self.currentQuestionIndex,
            "playerAnswers": self.playerAnswers,
            "scores": self.scores,
            "createdAt": self.createdAt,
            "updatedAt": self.updatedAt
        }
    
    @classmethod
    def fromDict(cls, data):
        """Convert dictionary (from Redis) to GameState object"""
        if not data:
            return None
        
        state = cls(data.get("gameId"), data.get("hostId"))  # Include hostId when deserializing
        state.active = data.get("active", False)
        state.questions = data.get("questions", [])
        state.currentQuestionIndex = data.get("currentQuestionIndex", 0)
        state.playerAnswers = data.get("playerAnswers", {})
        state.scores = data.get("scores", {})
        state.createdAt = data.get("createdAt", int(time.time()))
        state.updatedAt = data.get("updatedAt", int(time.time()))
        
        return state
