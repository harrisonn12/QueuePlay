from enum import Enum

class Stage(Enum):
    DEVO="devo"
    PROD="prod"

class AppConfig:
    stage: Stage
