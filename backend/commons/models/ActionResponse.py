from pydantic import BaseModel

class ActionResponse(BaseModel):
    success: bool = False
    message: str = ""
    data: str = None
    error: str = None