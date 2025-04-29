import os
from openai import OpenAI
from ..enums.LLMModel import LLMModel
from ..enums.Prompt import Prompt
from ..enums.Role import Role
import json
import logging

logger = logging.getLogger(__name__)

# https://dagster.io/blog/python-environment-variables
class ChatGptAdapter:
  def __init__(self):
    logger.info("Attempting to initialize ChatGptAdapter...")
    apiKey = os.environ.get('CHATGPT_KEY')
    if not apiKey:
      logger.error("FATAL: Environment variable 'CHATGPT_KEY' not found!")
      raise ValueError("Missing required environment variable: CHATGPT_KEY")
    else:
      try:
        self.client = OpenAI(api_key=apiKey)
        logger.info("ChatGptAdapter initialized successfully.")
      except Exception as e:
        logger.error(f"Error initializing OpenAI client: {e}", exc_info=True)
        raise

  def generateSummary(self, message: str):
    if not self.client:
      logger.error("Cannot generate summary: ChatGptAdapter client not initialized.")
      return "Error: Service not configured."
    response = self.client.chat.completions.create(
      model= LLMModel.GPT_35_TURBO.value,
      messages=[
        {"role": "system", "content": Role.JOURNALIST.value},
        {"role": "assistant", "content": Prompt.SUMMARY_BULLETPOINTS_250.value},
        {"role": "user", "content": message}
      ]
    )

    return response.choices[0].message.content


  def generateJson(self, prompt : str):
    response = self.client.chat.completions.create(
      model= LLMModel.GPT_35_TURBO.value,
      messages=[
        {"role": "user", "content": prompt}
      ],
      response_format = {"type": "json_object"}
    )
    
    return response.choices[0].message.content