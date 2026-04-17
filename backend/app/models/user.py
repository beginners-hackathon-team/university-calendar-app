from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)  # idはPK, 自動でインクリメント
    student_id: Mapped[str] = mapped_column(
        String(10), unique=True, index=True
    )  # 学籍番号たしか10桁なはず, 重複不可, 検索高速化用インデックス
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),  # DB側でタイムスタンプ生成
    )
