from backend.GameService.games.BaseGame import BaseGame
from backend.GameService.games.GameState import GameState
import json
import asyncio
from backend.QuestionService.QuestionService import QuestionService


class TriviaGame(BaseGame):

    def __init__(self, gameId, hostId, questionService: QuestionService):
        super().__init__(gameId, hostId)
        self.questionService = questionService 
        self.gameState = GameState()

    async def startGame(self, connections):
        numQuestions = 5
        questionSet = self.questionService.getQuestionAnswerSet(numQuestions)
        if not questionSet or "questions" not in questionSet:
            print("Failed to retrieve questions, aborting game start.")
            return
        
        self.gameState.reset()
        self.gameState.questions = questionSet["questions"]
        self.gameState.active = True
        self.gameState.initializeScores(self.clients)

        print(f"Game started, initial scores: {self.gameState.scores}")
        print(f"Game started, with {len(self.gameState.questions)} questions.")

        await self.broadcast(json.dumps({
            "action": "gameStarted",
            "questions": self.gameState.questions,
        }), connections)


    async def submitAnswer(self, clientId, questionIndex, answerIndex, connections):
        if not self.gameState.active:
            return

        print(f"Player {clientId} submitted answer {answerIndex} for question {questionIndex}")
        self.gameState.addPlayerAnswer(questionIndex, clientId, answerIndex)

        if clientId in connections:
            await connections[clientId].send(json.dumps({
                "action": "answerSubmitted",
                "questionIndex": questionIndex
            }))

        if self.hostId in connections:
            await connections[self.hostId].send(json.dumps({
                "action": "playerAnswered",
                "clientId": clientId,
                "questionIndex": questionIndex
            }))

    async def calculateAndSendScores(self, questionIndex, connections):
        """Calculate scores for a question and send results"""
        if questionIndex < len(self.gameState.questions):
            correctAnswer = self.gameState.questions[questionIndex].get("answerIndex")
            playerAnswers = self.gameState.playerAnswers.get(questionIndex, {})
            
            for clientId, answerIndex in playerAnswers.items():
                if answerIndex == correctAnswer:
                    self.gameState.updateScore(clientId, 1)
                    print(f"Player {clientId} answered correctly. New score: {self.gameState.scores[clientId]}")
                else:
                    print(f"Player {clientId} answered incorrectly ({answerIndex})")
            
            print(f"Broadcasting scores: {self.gameState.scores}")
            await self.broadcast(json.dumps({
                "action": "questionResult",
                "scores": self.gameState.scores
            }), connections)        

    async def nextQuestion(self, connections):
        if not self.gameState.active:
            return

        currentIndex = self.gameState.currentQuestionIndex
        print(f"Moving from question {currentIndex} to next")
        
        await self.calculateAndSendScores(currentIndex, connections)
        
        if self.gameState.moveToNextQuestion():
            print(f"Moving to question {self.gameState.currentQuestionIndex}")
            await self.broadcast(json.dumps({
                "action": "nextQuestion",
                "questionIndex": self.gameState.currentQuestionIndex,
            }), connections)
        else:
            print("No more questions, ending game")
            self.gameState.active = False
            await self.broadcast(json.dumps({
                "action": "gameFinished",
                "finalScores": self.gameState.scores
            }), connections)