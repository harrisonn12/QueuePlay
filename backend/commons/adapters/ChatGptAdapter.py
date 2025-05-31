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

  def moderateContent(self, text: str) -> dict:
    """
    Moderate content using OpenAI's moderation API.
    
    Args:
        text: The text content to moderate
        
    Returns:
        dict: Moderation response containing flagged status and categories
        
    Raises:
        Exception: If moderation API call fails
    """
    if not self.client:
      logger.error("Cannot moderate content: ChatGptAdapter client not initialized.")
      raise ValueError("ChatGptAdapter client not initialized")
    
    try:
      logger.debug(f"Moderating content: '{text[:50]}{'...' if len(text) > 50 else ''}'")
      response = self.client.moderations.create(input=text)
      
      moderation_result = response.results[0]
      result = {
        "flagged": moderation_result.flagged,
        "categories": {k: v for k, v in moderation_result.categories.model_dump().items() if v},
        "category_scores": moderation_result.category_scores.model_dump(),
        "original_text": text
      }
      
      if result["flagged"]:
        logger.warning(f"Content flagged by moderation: {result['categories']}")
      else:
        logger.debug("Content passed moderation check")
        
      return result
      
    except Exception as e:
      logger.error(f"Error in content moderation: {e}", exc_info=True)
      raise

  def generateText(self, prompt: str, system_message: str = None) -> str:
    """
    Generate text using OpenAI's chat completion API.
    
    Args:
        prompt: The user prompt
        system_message: Optional system message to guide the AI
        
    Returns:
        str: Generated text response
    """
    if not self.client:
      logger.error("Cannot generate text: ChatGptAdapter client not initialized.")
      return "Error: Service not configured."
      
    try:
      messages = []
      if system_message:
        messages.append({"role": "system", "content": system_message})
      messages.append({"role": "user", "content": prompt})
      
      response = self.client.chat.completions.create(
        model=LLMModel.GPT_35_TURBO.value,
        messages=messages,
        max_tokens=100,  # Keep responses concise for username generation
        temperature=0.7  # Add some creativity
      )
      
      return response.choices[0].message.content.strip()
      
    except Exception as e:
      logger.error(f"Error generating text: {e}", exc_info=True)
      raise