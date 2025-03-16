from enum import Enum

# https://docs.python.org/3/howto/enum.html
class Prompt(Enum):
    SUMMARY_BULLETPOINTS_250 = 'write a detailed 250 word summary of this video, after the summary write a set of key takeaway bulletpoints'
    FIRST_PERSON_VIEW = "Take those key takeaways and turn them into an article. Dont describe 'what the speaker says' but rather come up with your interpretation as if it was an article "
