import openai 
from enums import QuestionTopic
from backend.commons.adapters import ChatGptAdapter
from enums import QuestionTopic


class QuestionService:
    #there should not be any business logic in the service, so
        #the only 2 methods we need
        #get quesiton asnwer set
        #get available topics

    
    #this is dependency injection
    def __init__(self, chatGptAdapter : ChatGptAdapter , questionAnswerSetGenerator : QuestionAnswerSetGenerator):

        """constructor and also for declaring instance variables
            questionAnswerSetGenerator is dependency injection
            
        """
        #self.client = use adapter for openai
            #we use adapter so we can change the api provider if we need to 
        
        self.chatGptAdapter = chatGptAdapter
        
        #initialize the questionAnswerSetGenerator here
        self.questionAnswerSetGenerator = questionAnswerSetGenerator

    def getQuestionAnswerSet(self):
        '''gets all the question answer set from the questionanswersetgenerator

        from the available topics, get a topic by random.

        '''

        #call getAvailableTopic and choiose a random one from the list
        #then, pass it in the generate all 
        
        topic = getRandomTopic()
        
        return self.questionAnswerSetGenerator.generateQuestionAnswerSet(topic, questions_per_topic)

    
    def getRandomTopic(self):
        '''returns random topic'''
        return QuestionTopic.getRandom()

    
    def getAvailableTopics(self):
        '''gets the available topics from the enum'''
        return QuestionTopic.getAllTopicValues()




    