from fastapi import APIRouter
from datetime import date, time
from app.schemas.calendar import (
    CalendarResponse,
    CalendarCourse,
    CalendarPersonalEvent,
    CalendarUniversityEvent,
)

# 全てのパスに /api を自動でつける
router = APIRouter(prefix="/api", tags=["calendar"])


# クエリパラメータ(?start=...&end=...)を自動で受け取る
@router.get("/calendar", response_model=CalendarResponse)  # レスポンスの型を保証
def get_calendar(start: date, end: date):
    # TODO: DB実装。今はダミー
    return CalendarResponse(
        courses=[
            CalendarCourse(
                course_id=1,
                name="情報セキュリティ",
                room="大講義室A",
                teacher="山田太郎",
                date=date(2026, 4, 15),
                period=3,
            ),
        ],
        personal_events=[
            CalendarPersonalEvent(
                id=1,
                title="バイト",
                date=date(2026, 4, 16),
                start_time=time(17, 0),
                end_time=time(22, 30),
            )
        ],
        university_events=[],
    )
