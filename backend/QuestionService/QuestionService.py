import openai
from backend.commons.adapters.ChatGptAdapter import ChatGptAdapter
from backend.QuestionService.src.enums.QuestionTopic import QuestionTopic
from backend.QuestionService.src.QuestionAnswerSetGenerator import QuestionAnswerSetGenerator

class QuestionService:
    #there should not be any business logic in the service, so
        #the methods we need are
        #get quesiton answer set
        #get random question
        # (might not need this) get available topics


    def __init__(self, chatGptAdapter : ChatGptAdapter , questionAnswerSetGenerator : QuestionAnswerSetGenerator):

        """uses dependency injection"""

        #we use adapter so we can change the api provider if we need to
        self.chatGptAdapter = chatGptAdapter

        #initialize the questionAnswerSetGenerator here
        self.questionAnswerSetGenerator = questionAnswerSetGenerator

    def getQuestionAnswerSet(self, numQuestions : int):
        '''gets all the question answer set from the chosen topic by random'''


        topic = self.getRandomTopic()

        return self.questionAnswerSetGenerator.generateQuestionAnswerSet(topic, numQuestions)


    def getRandomTopic(self):
        '''returns random topic'''
        return QuestionTopic.getRandom()


    def getAvailableTopics(self):
        '''gets all topics from the enum'''
        return QuestionTopic.getAllTopicValues()
