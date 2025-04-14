class GameState:
    def __init__(self):
        self.active = False
        self.questions = []
        self.currentQuestionIndex = 0
        self.playerAnswers = {}  # {questionIndex: {clientId: answerIndex}}
        self.scores = {}  # {clientId: score}

    def reset(self):
        self.active = False
        self.questions = []
        self.currentQuestionIndex = 0
        self.playerAnswers = {}
        self.scores = {}

    def initializeScores(self, clients):
        self.scores = {client: 0 for client in clients if clients[client] == "player"}

    def addPlayerAnswer(self, questionIndex, clientId, answerIndex):
        if questionIndex not in self.playerAnswers:
            self.playerAnswers[questionIndex] = {}
        self.playerAnswers[questionIndex][clientId] = answerIndex

    def updateScore(self, clientId, points):
        if clientId not in self.scores:
            self.scores[clientId] = 0
        self.scores[clientId] += points

    def getCurrentQuestion(self):
        if self.currentQuestionIndex < len(self.questions):
            return self.questions[self.currentQuestionIndex]
        return None

    def moveToNextQuestion(self):
        self.currentQuestionIndex += 1
        return self.currentQuestionIndex < len(self.questions)
