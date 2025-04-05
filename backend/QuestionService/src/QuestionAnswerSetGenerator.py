import json
from backend.QuestionService.src.enums import QuestionTopic
from backend.commons.adapters.ChatGptAdapter import ChatGptAdapter

#core logic of how I get answer and question
class QuestionAnswerSetGenerator:

    def __init__(self, chatGptAdapter : ChatGptAdapter):
        self.chatGptAdapter = chatGptAdapter


    # def generateAllQuestionAnswerSets(self, topics: list[QuestionTopic], questionsPerTopic: int) -> dict:
    #     #for type hint, cant do list(QuestionTopic) because converts enum to list.
    #     allQuestions = {}
    #     for topic in topics:
    #         questionSet = self.generateQuestionAnswerSet(topic, questionsPerTopic)
    #         #we just get the questions from the returned dict because we dont need topic.
    #         #we dont need topic because we already have topic.
    #         allQuestions[topic.value] = questionSet["questions"]
    #     return allQuestions


    def generateQuestionAnswerSet(self, topic : QuestionTopic, questionsPerTopic : int) -> dict:
        '''from topic, generate set amount of question answer set'''

        prompt = f"""
        Create {questionsPerTopic} questions and answers set in json format about {topic.value}, so
        the structure should be like this:
        {{
            "topic": "{{{topic.value}}}",
            "questions": [
                {{
                    "question": "question text",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "answerIndex": 0
                }},
                "more questions..."
            ]
        }}

        An example is like this:
        {{
            "topic": "Music",
            "questions": [
                {{
                    "question": "Who is the lead singer of the band Coldplay?",
                    "options": ["Micheal Jackson", "Chris Martin", "Billy Joel", "Skrillex"],
                    "answerIndex": 1
                }}
            ]
        }}

        Always mix up where answerIndex is located in the list of options.
        """

        #the response in json format
        ans = self.chatGptAdapter.generateJson(prompt)

        #parses json to dict
        res = json.loads(ans)

        return res
