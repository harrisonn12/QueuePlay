from backend.games.BaseGame import BaseGame
import json
import asyncio
from backend.QuestionService.QuestionService import QuestionService


class TriviaGame(BaseGame):

    def __init__(self, gameId, hostId, questionService: QuestionService):
        super().__init__(gameId, hostId)
        self.questionService = questionService 
        self.gameState = {
            "active": False, 
            "questions": [], 
            "currentQuestionIndex": 0,
            "playerAnswers" : {}, # {questionindex : {clientId : answerIndex}}
            "scores" : {}, # {clientId : score}
        }

    async def startGame(self, connections):
        numQuestions = 5
        questionSet = self.questionService.getQuestionAnswerSet(numQuestions)
        if not questionSet or "questions" not in questionSet:
            print("Failed to retrieve questions, aborting game start.")
            return
        
        self.gameState["questions"] = questionSet["questions"]
        self.gameState["active"] = True
        self.gameState["currentQuestionIndex"] = 0
        self.gameState["playerAnswers"] = {}
        self.gameState["scores"] = {client: 0 for client in self.clients if self.clients[client] == "player"}

        print(f"Game started, initial scores: {self.gameState['scores']}")
        print(f"Game started, with {len(self.gameState['questions'])} questions.")

        await self.broadcast(json.dumps({
            "action": "gameStarted",
            "questions": self.gameState["questions"]
        }), connections)

    async def submitAnswer(self, clientId, questionIndex, answerIndex, connections):
        if not self.gameState["active"]:
            return

        print(f"Player {clientId} submitted answer {answerIndex} for question {questionIndex}")

        if questionIndex not in self.gameState["playerAnswers"]:
            self.gameState["playerAnswers"][questionIndex] = {}
        
        self.gameState["playerAnswers"][questionIndex][clientId] = answerIndex

        # if clientId not in self.gameState["scores"]:
        #     self.gameState["scores"][clientId] = 0
        #     print(f"Added new player {clientId} to scores with 0 points")

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

        if questionIndex < len(self.gameState["questions"]):
            # Get correct answer
            correctAnswer = self.gameState["questions"][questionIndex].get("answerIndex")
            # if correctAnswer is None:  # Fallback for different field name
            #     correctAnswer = self.gameState["questions"][questionIndex].get("correctAnswer")
            
            # Get player answers for this question
            playerAnswers = self.gameState["playerAnswers"].get(questionIndex, {})
            
            # Update scores
            for clientId, answerIndex in playerAnswers.items():
                if answerIndex == correctAnswer:
                    self.gameState["scores"][clientId] = self.gameState["scores"].get(clientId, 0) + 1
                    print(f"Player {clientId} answered correctly. New score: {self.gameState['scores'][clientId]}")
                else:
                    print(f"Player {clientId} answered incorrectly ({answerIndex})")
            
            # Broadcast updated scores to all players
            print(f"Broadcasting scores: {self.gameState['scores']}")
            await self.broadcast(json.dumps({
                "action": "questionResult",
                "scores": self.gameState["scores"]
            }), connections)        

    async def nextQuestion(self, connections):
        if not self.gameState["active"]:
            return

        # Calculate scores for the current question if not already done
        currentIndex = self.gameState["currentQuestionIndex"]
        print(f"Moving from question {currentIndex} to next")
        
        # Calculate scores for current question
        await self.calculateAndSendScores(currentIndex, connections)
        
        # Move to next question
        self.gameState["currentQuestionIndex"] += 1
        nextIndex = self.gameState["currentQuestionIndex"]
        
        if nextIndex < len(self.gameState["questions"]):
            print(f"Moving to question {nextIndex}")
            await self.broadcast(json.dumps({
                "action": "nextQuestion",
                "questionIndex": nextIndex
            }), connections)
        else:
            # If no more questions, end the game
            print("No more questions, ending game")
            self.gameState["active"] = False
            await self.broadcast(json.dumps({
                "action": "gameFinished",
                "finalScores": self.gameState["scores"]
            }), connections)