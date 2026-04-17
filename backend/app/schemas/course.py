from pydantic import BaseModel, Field
from typing import Literal

# user_id は JWTから取得する


# 授業共通
class CourseBase(BaseModel):
    name: str
    room: str
    teacher: str
    day_of_week: Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    period: int = Field(ge=1, le=6)
    quarter_id: int  # 外部キー


# 授業登録（POSTリクエスト）
class CourseCreate(CourseBase):
    pass


# 授業更新（PUTリクエスト）
class CourseUpdate(CourseBase):
    pass


# 授業レスポンス共通
class CourseResponse(CourseBase):
    id: int
