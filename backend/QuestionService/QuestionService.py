import openai
import logging
from typing import Dict, Any
from commons.adapters.ChatGptAdapter import ChatGptAdapter
from QuestionService.src.enums.QuestionTopic import QuestionTopic
from QuestionService.src.QuestionAnswerSetGenerator import QuestionAnswerSetGenerator
from QuestionService.src.QuestionModerator import QuestionModerator

logger = logging.getLogger(__name__)


class QuestionService:
    #there should not be any business logic in the service, so
        #the methods we need are
        #get quesiton answer set
        #get random question
        # (might not need this) get available topics


    def __init__(self, chatGptAdapter: ChatGptAdapter, questionAnswerSetGenerator: QuestionAnswerSetGenerator):
        """uses dependency injection"""

        #we use adapter so we can change the api provider if we need to
        self.chatGptAdapter = chatGptAdapter

        #initialize the questionAnswerSetGenerator here
        self.questionAnswerSetGenerator = questionAnswerSetGenerator
        
        #initialize the question moderator
        self.questionModerator = QuestionModerator(chatGptAdapter)
        
        logger.info("QuestionService initialized successfully")

    def getQuestionAnswerSet(self, numQuestions: int) -> dict:
        '''gets all the question answer set from the chosen topic by random with moderation'''
        
        for attempt in range(3):  # Try up to 3 times to get safe content
            try:
                topic = self.getRandomTopic()
                question_set = self.questionAnswerSetGenerator.generateQuestionAnswerSet(topic, numQuestions)
                
                # Moderate the generated content
                if self._is_safe_content(question_set):
                    logger.info(f"Generated safe question set for topic: {topic.value}")
                    return question_set  # Return original format
                else:
                    logger.warning(f"Generated content flagged by moderation, attempt {attempt + 1}")
                    
            except Exception as e:
                logger.warning(f"Generation attempt {attempt + 1} failed: {e}")
                continue
        
        logger.error("Failed to generate safe question set after 3 attempts")
        raise Exception("Failed to generate safe content after moderation checks")

    def _is_safe_content(self, question_set: dict) -> bool:
        """Check content safety using AI moderation."""
        try:
            return self.questionModerator.moderate_question_set(question_set)
        except Exception:
            return False  # Conservative - if moderation fails, reject

    def getRandomTopic(self):
        '''returns random topic'''
        return QuestionTopic.getRandom()

    def getAvailableTopics(self):
        '''gets all topics from the enum'''
        return QuestionTopic.getAllTopicValues()
