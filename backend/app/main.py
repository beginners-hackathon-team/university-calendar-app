from fastapi import FastAPI
from pydantic import BaseModel, EmailStr

app = FastAPI()


class CreateUser(BaseModel):
    name: str
    password: str
    email: EmailStr


class ReadUser(BaseModel):
    name: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


list = []


@app.post("/api/user")
def create_user(user: CreateUser):
    list.append(user.name)
    return user


@app.get("/api/user")
def get_users():
    return list


@app.get("/api/user/{user_name}")
def get_user(user_name: str):
    if user_name in list:
        return user_name

    else:
        return None


@app.delete("/api/user")
def delete_user(user_name: str):
    if user_name in list:
        list.remove(user_name)
        return list

    else:
        return None
