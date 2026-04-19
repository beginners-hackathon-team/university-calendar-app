from fastapi import FastAPI, Response, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from pytest import Session
from datetime import date
from app.models.user import User, uuid_str
from app.db.session import get_db

app = FastAPI()


# ユーザー登録
class CreateUser(BaseModel):
    name: str
    password: str
    email: EmailStr


# ユーザー読み込み
class ReadUser(BaseModel):
    name: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


users = []


@app.post("/api/user")
def create_user(user: CreateUser, db: Session = Depends(get_db)):
    user = User(name=user.name, email=user.email, password_hash=user.password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.get("/api/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()


@app.get("/api/user/{id}")
def get_user(id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@app.delete("/api/user/{id}")
def delete_user(id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# 講義登録
class CreateCourse(BaseModel):
    name: str
    room: str
    date: date
    period: int


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
            return Response(status_code=204)

    raise HTTPException(status_code=404, detail="Corse not found")


@app.delete("/api/course")
def delete_course(course_id: str):
    for i, course in enumerate(courses):
        if course_id == course[0]:
            courses.pop(i)
            return Response(status_code=204)

    raise HTTPException(status_code=404, detail="Course not found")
