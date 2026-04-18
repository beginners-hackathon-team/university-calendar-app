from fastapi import FastAPI
from pydantic import BaseModel, EmailStr
from app.models.user import uuid_str
from datetime import date

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


list = []


@app.post("/api/user")
def create_user(user: CreateUser):
    list.append(user.name)
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
    ["ghi", "量子コンピューティング", "大講義室C", date(2026, 4, 17), 4],
]


@app.get("/api/courses")
def get_courses():
    return courses


@app.post("/api/course")
def create_course(course: CreateCourse):
    course_id = uuid_str()

    new_course = [course_id, course.name, course.room, course.date, course.period]

    courses.append(new_course)

    return new_course


@app.get("/api/course/{course_id}")
def get_course(course_id: str):
    for course in courses:
        if course_id == course[0]:
            return course

    return None


@app.delete("/api/course")
def delete_course(course_id: str):
    for i, course in enumerate(courses):
        if course_id == course[0]:
            courses.pop(i)
            return courses

    return None
