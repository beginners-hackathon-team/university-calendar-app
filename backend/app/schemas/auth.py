from pydantic import BaseModel


# ユーザー登録（POSTリクエスト）
class RegisterRequest(BaseModel):
    student_id: str
    password: str  # APIで受け取る平文


# ユーザー情報（GETレスポンス）
class UserResponse(BaseModel):
    id: int
    student_id: str
    # password_hashは返さない


# ログイン（POST）
class LoginRequest(BaseModel):
    student_id: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
