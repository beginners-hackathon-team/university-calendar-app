from fastapi import FastAPI
from pydantic import BaseModel, EmailStr

app = FastAPI()


class CreateUser(BaseModel):
    name: str
    pas: str
    mail: EmailStr


class ReadUser(BaseModel):
    name: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


list = []


@app.post("/spi/user")
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
        return -1


@app.delete("/api/user")
def delete_user(user_name: str):
    if user_name in list:
        list.remove(user_name)
        return list

    else:
        return -1
