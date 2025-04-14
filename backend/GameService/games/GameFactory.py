from backend.GameService.games.TriviaGame import TriviaGame
from backend.QuestionService.QuestionService import QuestionService
from backend.QuestionService.src.QuestionAnswerSetGenerator import QuestionAnswerSetGenerator
from backend.commons.adapters.ChatGptAdapter import ChatGptAdapter

class GameFactory:
    def __init__(self):
        self.chatGptAdapter = ChatGptAdapter()
        self.questionAnswerSetGenerator = QuestionAnswerSetGenerator(self.chatGptAdapter)
        self.questionService = QuestionService(self.chatGptAdapter, self.questionAnswerSetGenerator)
    
    def createGame(self, gameType, gameId, hostId):
        if gameType == "trivia":
            return TriviaGame(gameId, hostId, self.questionService)
        else:
            raise ValueError("Unknown game type")
