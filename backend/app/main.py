from fastapi import FastAPI, Response, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import date
from app.models.user import User  # uuid_str
from app.models.course import Course
from app.models.course_date import CourseDate
from app.models.enrollment import Enrollment
from app.db.session import get_db
from app.services.schedule import build_class_dates

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
    teacher: str
    year: int
    quarter: int
    day_of_week: str
    period: int


courses = [
    ["abc", "情報セキュリティ", "大講義室A", "山田太郎", "2026", 1, "月", 3],
    ["def", "アルゴリズム", "大講義室B", "山田太郎", "2026", 2, "水", 2],
    ["ghi", "量子コンピューティング", "大講義室C", "山田太郎", "2026", 3, "金", 4],
]

# id, 授業名, 教室, 先生, 日にちリスト、時限
calendar = [
    [
        "abc",
        "情報セキュリティ",
        "大講義室A",
        "山田太郎",
        [date(2026, 4, 15), date(2026, 4, 22)],  # クォータの期間内で開催する日のリスト
        3,
    ],
    [
        "def",
        "アルゴリズム",
        "大講義室B",
        "山田太郎",
        [date(2026, 4, 16), date(2026, 4, 23)],
        2,
    ],
    [
        "ghi",
        "量子コンピューティング",
        "大講義室C",
        "山田太郎",
        [date(2026, 4, 17), date(2026, 4, 24)],
        4,
    ],
]


# @app.get("/api/courses")
# def get_courses():
#     return courses


@app.post("/api/course")
def create_course(create_course: CreateCourse, db: Session = Depends(get_db)):
    course = Course(
        name=create_course.name, room=create_course.room, teacher=create_course.teacher
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    course_date = CourseDate(
        course_id=course.id,
        year=create_course.year,
        quarter=create_course.quarter,
        day_of_week=create_course.day_of_week,
        period=create_course.period,
    )
    db.add(course_date)
    db.commit()
    db.refresh(course_date)

    user = db.query(User).first()
    enroll = Enrollment(course_id=course.id, user_id=user.id)
    db.add(enroll)
    db.commit()
    db.refresh(enroll)

    # return course, course_date
    return user


# @app.get("/api/courses/{year_month}")
# def get_courses(year_month: str, db: Session = Depends(get_db)):
#     year, month = map(int, year_month.split("-"))

#     user = db.query(User).first()
#     enrollments = db.query(Enrollment).filter(Enrollment.user_id == user.id).all()

#     if not enrollments:
#         return []

#     course_ids = [enrollment.course_id for enrollment in enrollments]

#     courses = db.query(Course).filter(Course.id.in_(course_ids)).all()
#     course_dates = (
#         db.query(CourseDate).filter(CourseDate.course_id.in_(course_ids)).all()
#     )

#     course_map = {course.id: course for course in courses}

#     course_dates_map: dict[str, list[CourseDate]] = {}
#     for course_date in course_dates:
#         course_dates_map.setdefault(course_date.course_id, []).append(course_date)

#     result = []

#     for course_id in course_ids:
#         course = course_map.get(course_id)
#         if not course:
#             continue

#         course_date_list = course_dates_map.get(course_id, [])

#         formatted_course_dates = []
#         for course_date in course_date_list:
#             all_dates = build_class_dates(
#                 course_date.year,
#                 course_date.quarter,
#                 course_date.day_of_week,
#             )

#             # 👇 月でフィルタ
#             filtered_dates = [
#                 d for d in all_dates if d.year == year and d.month == month
#             ]

#             if not filtered_dates:
#                 continue  # この月に授業ないならスキップ

#             formatted_course_dates.append(
#                 {
#                     "id": course_date.id,
#                     "course_id": course_date.course_id,
#                     "year": course_date.year,
#                     "quarter": course_date.quarter,
#                     "day_of_week": course_date.day_of_week,
#                     "period": course_date.period,
#                     "dates": filtered_dates,
#                 }
#             )

#         if not formatted_course_dates:
#             continue  # この月に授業ないcourseは出さない

#         result.append(
#             {
#                 "course": {
#                     "id": course.id,
#                     "name": course.name,
#                     "room": course.room,
#                     "teacher": course.teacher,
#                 },
#                 "course_dates": formatted_course_dates,
#             }
#         )

#     return result


@app.get("/api/courses/{year_month}")
def get_courses(year_month: str, db: Session = Depends(get_db)):
    year, month = map(int, year_month.split("-"))

    user = db.query(User).first()
    enrollments = db.query(Enrollment).filter(Enrollment.user_id == user.id).all()

    if not enrollments:
        return []

    course_ids = [enrollment.course_id for enrollment in enrollments]

    courses = db.query(Course).filter(Course.id.in_(course_ids)).all()
    course_dates = (
        db.query(CourseDate).filter(CourseDate.course_id.in_(course_ids)).all()
    )

    course_map = {course.id: course for course in courses}

    result = []

    for course_date in course_dates:
        course = course_map.get(course_date.course_id)
        if not course:
            continue

        all_dates = build_class_dates(
            course_date.year,
            course_date.quarter,
            course_date.day_of_week,
        )

        filtered_dates = [d for d in all_dates if d.year == year and d.month == month]

        if not filtered_dates:
            continue

        result.append(
            {
                "id": course.id,
                "name": course.name,
                "room": course.room,
                "teacher": course.teacher,
                "dates": filtered_dates,
                "period": course_date.period,
            }
        )

    return result


# @app.get("/api/course/{course_id}")
# def get_course(course_id: str):
#     for course in courses:
#         if course_id == course[0]:
#             return Response(status_code=204)

#     raise HTTPException(status_code=404, detail="Corse not found")


@app.delete("/api/course/{course_id}")
def delete_course(course_id: str, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).one_or_none()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    db.delete(course)
    db.commit()
    return Response(status_code=204)


@app.delete("/api/course")
def delete_all_courses(db: Session = Depends(get_db)):
    courses = db.query(Course).all()

    for course in courses:
        db.delete(course)

    db.commit()
    return Response(status_code=204)
