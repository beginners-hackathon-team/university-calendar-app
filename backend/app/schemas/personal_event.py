from pydantic import BaseModel
from datetime import date, time


# user_id は JWTから取得する


# 個人イベント共通
class PersonalEventBase(BaseModel):
    title: str
    date: date
    start_time: time
    end_time: time
    description: str | None = None


# 個人イベント追加(POST)
class PersonalEventCreate(PersonalEventBase):
    pass


# 個人イベント編集(PUT)
class PersonalEventUpdate(PersonalEventBase):
    pass


# 個人イベントレスポンス（共通）
class PersonalEventResponse(PersonalEventBase):
    id: int
