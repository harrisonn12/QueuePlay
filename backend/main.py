from dotenv import load_dotenv
from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/exampleGetAPI")
def exampleGetAPI() -> str:
    return "Hello"


if __name__ == '__main__':
    load_dotenv()
    uvicorn.run(app, host="0.0.0.0", port=8000)
