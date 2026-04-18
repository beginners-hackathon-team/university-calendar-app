from fastapi import Depends, FastAPI
from pydantic import BaseModel, EmailStr
from pytest import Session
from app.models.user import User
from app.db.session import get_db

app = FastAPI()


class CreateUser(BaseModel):
    name: str
    password: str
    email: EmailStr


class ReadUser(BaseModel):
    name: str


class CreateCourse(BaseModel):
    name: str
    room: str
    date: date
    period: int


@app.get("/api/health")
def health():
    return {"status": "ok"}


list = [[], [], []]


@app.post("/api/user")
def create_user(user: CreateUser, db: Session = Depends(get_db)):
    user = User(name=user.name, email=user.email, password_hash=user.password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.get("/api/users")
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


# id, 授業名, 教室, date, 時限
courses = [
    ["abc", "情報セキュリティ", "大講義室A", date(2026, 4, 15), 3],
    ["def", "アルゴリズム", "大講義室B", date(2026, 4, 16), 2],
    ["abc", "量子コンピューティング", "大講義室C", date(2026, 4, 17), 4],
]


@app.get("/api/courses")
def get_courses():
    return courses
