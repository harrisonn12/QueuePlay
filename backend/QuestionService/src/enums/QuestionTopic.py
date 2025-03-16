from enum import Enum
import random

# we use enum because easier to code then generating each topic 
# and might need to know which topics are necessary
class QuestionTopic(Enum):
    FOOD = "Food"
    HISTORY = "History"
    MUSIC = "Music"
    SPORTS = "Sports"
    ART = "Art"



    @classmethod
    def getAllTopicValues(cls):
        """return all topic values"""
        return [topic.value for topic in cls]

    @classmethod
    def getRandom(cls):
        """return a random topic from the enum"""
        return random.choice(list(cls))


