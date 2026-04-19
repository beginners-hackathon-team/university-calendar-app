from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String
from app.utils.uuid import uuid_str
from app.db.base import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=uuid_str)
    name: Mapped[str] = mapped_column(String)
    room: Mapped[str] = mapped_column(String)
    teacher: Mapped[str] = mapped_column(String)
