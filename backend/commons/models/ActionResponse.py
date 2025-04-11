from pydantic import BaseModel

class ActionResponse(BaseModel):
    success: bool = ""
    message: str = ""
    data: str = None
    error: str = None
