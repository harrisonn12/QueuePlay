from backend.games.TriviaGame import TriviaGame
from backend.QuestionService.QuestionService import QuestionService
from backend.QuestionService.src.QuestionAnswerSetGenerator import QuestionAnswerSetGenerator
from backend.commons.adapters.ChatGptAdapter import ChatGptAdapter

class GameFactory:
    chatGptAdapter = ChatGptAdapter()
    questionAnswerSetGenerator = QuestionAnswerSetGenerator(chatGptAdapter)
    questionService = QuestionService(chatGptAdapter, questionAnswerSetGenerator)
    
    #static method is a method that belongs to the class itself, not an instance of the class.
    #can call a static method without creating an object (instance) of the class.
    #instance doesn't matter for factory methods because its a method that creates instances of other classes.
    @staticmethod 
    def createGame(gameType, gameId, hostId):
        if gameType == "trivia":
            return TriviaGame(gameId, hostId, GameFactory.questionService)
        else:
            raise ValueError("Unknown game type")
