from commons.enums.Stage import Stage

class AppConfig:
    def __init__(self, stage: Stage = Stage.DEVO):
        self.stage = stage
