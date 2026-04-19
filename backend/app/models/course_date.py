from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, Foreign_key
from app.models.user import uuid_str
from app.db.base import Base


class CourseDate(Base):
    __tablename__ = "course_dates"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_str)
    course_id: Mapped[str] = mapped_column(
        String, Foreign_key("courses.id", ondelete="CASCADE")
    )
    year: Mapped[int] = mapped_column(Integer)
    day_of_week: Mapped[str] = mapped_column(String)
    period: Mapped[int] = mapped_column(Integer)
