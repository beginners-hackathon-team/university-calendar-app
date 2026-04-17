from pydantic import BaseModel, Field
from datetime import date, time
from typing import Literal


# 授業
class CalendarCourse(BaseModel):
    course_id: int
    name: str
    room: str
    teacher: str
    date: date
    period: int = Field(ge=1, le=6)


# 個人イベント
class CalendarPersonalEvent(BaseModel):
    id: int
    title: str
    date: date
    start_time: time
    end_time: time


# 大学イベント
class CalendarUniversityEvent(BaseModel):
    id: int
    name: str
    date: date
    type: Literal["holiday", "exam", "transfer", "interval", "other"]


# カレンダーレスポンス
class CalendarResponse(BaseModel):
    courses: list[CalendarCourse]
    personal_events: list[CalendarPersonalEvent]
    university_events: list[CalendarUniversityEvent]
