import json
from enums import QuestionTopic


#core logic of how I get answer and question
class QuestionAnswerSetGenerator:

    def __init__(self):
        pass

    
    # def generateAllQuestionAnswerSets(self, topics: list[QuestionTopic], questionsPerTopic: int) -> dict:
    #     #for type hint, cant do list(QuestionTopic) because converts enum to list.
    #     allQuestions = {}
    #     for topic in topics:
    #         questionSet = self.generateQuestionAnswerSet(topic, questionsPerTopic)
    #         #we just get the questions from the returned dict because we dont need topic.
    #         #we dont need topic because we already have topic.
    #         allQuestions[topic.value] = questionSet["questions"]
    #     return allQuestions


    #generate answer question set
    #generate quesiton answer set, no topic generate necessary because in enum
    def generateQuestionAnswerSet(self, topic : QuestionTopic, questionsPerTopic : int) -> dict:
        '''for topic, generate set amount of questions

            answer would return an index instead of a string because its
            easier to search and more efficeint

            the prompt for openai should be: give me a question and answer set in json format 
            about given topic. tell me which one is right answer by giving me an index.

        '''

        prompt = f"""
        Create {questionsPerTopic} questions and answers set in json format about {topic.value}, so 
        the structure should be like this:
        {{
        "topic": "{"topic value"}",
        "questions": [
            {{
                "question": "question text",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "answer_index": 0 
            }},
            // more questions...
        ]
        }}

        Example:
        {{
            "topic": "Science",
            "questions": [
                {
                    "question": "Which of the following is NOT a state of matter?",
                    "options": ["Solid", "Liquid", "Gas", "Force"],
                    "answer_index": 3
                }
            ]
        }}

        Always mix up where the answer is located in the list of options.
        """

        ans = self.chatGptAdapter.call(prompt)

        res = json.loads(ans)
        return res










