from pydantic import BaseModel
from typing import Optional

class HandleUserLoginResponse(BaseModel):
    error: Optional[str] = None
    message: Optional[str] = None