from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Foreign_key
from app.models.user import uuid_str
from app.db.base import Base


class Enrollment(Base):
    __tablename__ = "enrollments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_str)
    course_id: Mapped[str] = mapped_column(
        String, Foreign_key("courses.id", ondelete="CASCADE")
    )
    user_id: Mapped[str] = mapped_column(
        String, Foreign_key("uses.id", ondelete="CASCADE")
    )
