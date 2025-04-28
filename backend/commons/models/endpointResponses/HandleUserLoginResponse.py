from pydantic import BaseModel

class HandleUserLoginResponse(BaseModel):
    error: str = None
    message: str = None