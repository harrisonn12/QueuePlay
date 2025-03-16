import os
from openai import OpenAI
from ..enums.LLMModel import LLMModel
from ..enums.Prompt import Prompt
from ..enums.Role import Role

# https://dagster.io/blog/python-environment-variables
class ChatGptAdapter:

    def __init__(self):
        try:
            apiKey = os.environ['CHATGPT_KEY']
        except KeyError:
            print("Environment variable does not exist")
            os.environ['CHATGPT_KEY'] = input("What is your OpenAI key?\n")
            apiKey = os.environ['CHATGPT_KEY']

        self.client = OpenAI(api_key=apiKey)

    def generateSummary(self, message: str):
        response = self.client.chat.completions.create(
          model= LLMModel.GPT_35_TURBO.value,
          messages=[
            {"role": "system", "content": Role.JOURNALIST.value},
            {"role": "assistant", "content": Prompt.SUMMARY_BULLETPOINTS_250.value},
            {"role": "user", "content": message}
          ]
        )

        return response.choices[0].message.content
