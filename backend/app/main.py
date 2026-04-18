from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class CreateUser(BaseModel):
    name: str


class ReadUser(BaseModel):
    name: str


@app.get("/api/health")
def health():
    return {"status": "ok"}
