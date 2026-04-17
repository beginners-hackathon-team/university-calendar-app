# Backend 認証系タスク（担当A）

BE-0 完了後に着手。BE-A1 が他のタスクの前提。

- [BE-A1 パスワードハッシュ + JWT ユーティリティ](#be-a1-パスワードハッシュ--jwt-ユーティリティ)
- [BE-A2 POST /api/auth/register](#be-a2-post-apiauthregister)
- [BE-A3 POST /api/auth/login](#be-a3-post-apiauthlogin)
- [BE-A4 GET /api/auth/me + get_current_user Depends](#be-a4-get-apiauthme--get_current_user-depends)
- [BE-A5 POST /api/auth/logout](#be-a5-post-apiauthlogout)

← [TASKS.md に戻る](../TASKS.md)

---

## BE-A1 パスワードハッシュ + JWT ユーティリティ

**担当**: Backend 担当A（BE-A系の前提）

### 目的

認証の基盤となる4つの関数を `app/core/security.py` にまとめる。

- パスワードを平文で保存しないための **ハッシュ化 / 照合**
- ログイン状態を維持するための **JWT 発行 / 検証**

後続の BE-A2〜A5 および BE-B 系の全エンドポイントから import して使う。

### 受け入れ条件

- [ ] `backend/app/core/security.py` が存在し、以下が定義されている
  - `hash_password(password: str) -> str`
  - `verify_password(plain: str, hashed: str) -> bool`
  - `create_access_token(user_id: int) -> str`
  - `decode_token(token: str) -> dict`（失敗時は例外）
- [ ] `backend/pyproject.toml` に `passlib[bcrypt]` と `python-jose[cryptography]` が追加されている
- [ ] `.env` に `JWT_SECRET_KEY` が設定されている
- [ ] 下記「動作確認」のワンライナーが成功する

### 仕様

| 項目 | 値 |
|---|---|
| パスワードハッシュ | bcrypt |
| JWT 署名アルゴリズム | HS256（`settings.jwt_algorithm`） |
| トークン有効期限 | `settings.jwt_expire_minutes` 分（既定: 24時間） |
| ペイロード | `{ "sub": str(user_id), "exp": <UNIX time> }` |

JWT 関連の Settings は既に [app/core/config.py](../../backend/app/core/config.py) に定義済み（`jwt_secret_key`, `jwt_algorithm`, `jwt_expire_minutes`）。

### 実装手順

#### 1. 依存関係を追加

```bash
cd backend
uv add 'passlib[bcrypt]' 'python-jose[cryptography]'
```

#### 2. `.env` に秘密鍵を追加

ランダム文字列を生成：

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

`.env` に追記：

```
JWT_SECRET_KEY=<生成した文字列>
```

#### 3. `app/core/security.py` を新規作成

骨格：

```python
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt, JWTError
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_expire_minutes
    )
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(
        payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )


def decode_token(token: str) -> dict:
    # 失敗時は jose.JWTError が飛ぶ。呼び出し側でハンドリングする
    return jwt.decode(
        token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
    )
```

`get_current_user` は [BE-A4](#be-a4-get-apiauthme--get_current_user-depends) で同じファイルに追加する。

#### 4. 動作確認

```bash
cd backend
uv run python -c "
from app.core.security import hash_password, verify_password, create_access_token, decode_token
h = hash_password('test1234')
print('hash:', h)
print('verify ok:', verify_password('test1234', h))
print('verify ng:', verify_password('wrong', h))
t = create_access_token(1)
print('token:', t)
print('decoded:', decode_token(t))
"
```

期待: ハッシュが表示される／verify が True/False／token と payload が表示される。

### 考え方のヒント

- JWT の `sub` は **文字列** にする（`python-jose` は int の sub を受け付けない）。decode 時に `int()` で戻す
- `exp` は datetime を渡せば自動で UNIX time に変換される
- パスワードハッシュは毎回違う値になる（ソルトが混ざる）が `verify_password` が正しく判定する
- `CryptContext(deprecated="auto")` は「将来 bcrypt を置き換えるとき古いハッシュの扱いを自動判定」の設定。今は気にしなくてOK

### 参考

- [passlib ドキュメント](https://passlib.readthedocs.io/en/stable/)
- [python-jose ドキュメント](https://python-jose.readthedocs.io/en/latest/)

---

## BE-A2 POST /api/auth/register

**担当**: Backend 担当A（BE-A1 の後）

### 目的

学籍番号＋パスワードで新規ユーザー登録するエンドポイントを作る。

### 受け入れ条件

- [ ] `POST /api/auth/register` が 201 を返し、`users` テーブルに1件追加される
- [ ] `password_hash` が bcrypt でハッシュ化されて保存されている（平文ではない）
- [ ] 同じ `student_id` で再登録すると 409
- [ ] レスポンスに `password_hash` が含まれない
- [ ] `/docs` から操作できる

### 仕様

```
POST /api/auth/register
Content-Type: application/json

Request:
  { "student_id": "1234567890", "password": "hoge1234" }

Response 201:
  { "id": 1, "student_id": "1234567890" }

Response 409:
  { "detail": "student_id already exists" }
```

Pydantic スキーマは既に [schemas/auth.py](../../backend/app/schemas/auth.py) に定義済み（`RegisterRequest`, `UserResponse`）。

### 実装手順

#### 1. `app/api/auth.py` を新規作成

骨格：

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, UserResponse
from app.core.security import hash_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    # 1. 重複チェック
    existing = db.query(User).filter_by(student_id=payload.student_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="student_id already exists")

    # 2. ハッシュ化して保存
    user = User(
        student_id=payload.student_id,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
```

#### 2. `app/main.py` にルーターを登録

```python
from app.api import calendar, auth  # auth を追加

app.include_router(auth.router)  # 追加
```

#### 3. 動作確認

バックエンドを起動し、`http://localhost:8000/docs` を開く：

```bash
bash scripts/dev/start-backend.sh
```

`POST /api/auth/register` を実行 → 201が返ればOK。同じ学籍番号で再実行して 409 を確認。

DB に保存されているか：

```bash
docker compose exec db psql -U app -d app -c \
  "SELECT id, student_id, left(password_hash, 20) as hash_preview FROM users;"
```

### 考え方のヒント

- `response_model=UserResponse` を付けるだけで、User ORM オブジェクトの `password_hash` はレスポンスから自動で除外される（`UserResponse` に列がないため）
- FastAPI は Pydantic の型からリクエストバリデーションを自動で行う（`student_id` が無ければ 422）
- `db.refresh(user)` で DB から採番された `id` などを再取得する

---

## BE-A3 POST /api/auth/login

**担当**: Backend 担当A

### 目的

学籍番号＋パスワードを照合し、認証成功時に JWT を発行する。

### 受け入れ条件

- [ ] 正しい認証情報で 200 + トークンを返す
- [ ] 存在しないユーザー / パスワード不一致で 401
- [ ] 返された token を `decode_token` で復元すると `sub` にユーザーIDが入っている
- [ ] `/docs` から操作できる

### 仕様

```
POST /api/auth/login

Request:
  { "student_id": "1234567890", "password": "hoge1234" }

Response 200:
  { "access_token": "eyJhbGciOi...", "token_type": "bearer" }

Response 401:
  { "detail": "invalid credentials" }
```

スキーマは既に [schemas/auth.py](../../backend/app/schemas/auth.py) 定義済み（`LoginRequest`, `LoginResponse`）。

### 実装手順

#### 1. `app/api/auth.py` に `login` を追加

```python
from app.schemas.auth import LoginRequest, LoginResponse
from app.core.security import verify_password, create_access_token


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(student_id=payload.student_id).first()
    if not user or not verify_password(payload.password, user.password_hash):
        # 「存在しない」と「不一致」は区別しない（セキュリティ）
        raise HTTPException(status_code=401, detail="invalid credentials")

    token = create_access_token(user.id)
    return LoginResponse(access_token=token, token_type="bearer")
```

#### 2. 動作確認

- `/docs` から `POST /api/auth/login` を試す
- 返った `access_token` を [jwt.io](https://jwt.io/) に貼ってペイロード（`sub`, `exp`）を確認

### 考え方のヒント

- **「存在しない」と「パスワード違う」を別メッセージで返すのは避ける**。学籍番号の存在有無が漏れてしまう（アカウント列挙攻撃）
- `or` 演算子の短絡評価で、`user` が None のときに `verify_password` を呼ばずに済んでいる
- ログイン成功時に `user.last_login_at` などを更新したくなるかもしれないが、今回の仕様にはないので追加しない

---

## BE-A4 GET /api/auth/me + get_current_user Depends

**担当**: Backend 担当A（**最重要**）

### 目的

Bearer トークンから現在のユーザーを取り出す **共通の依存関数** `get_current_user` を作る。BE-B 系の全ての認証必須エンドポイントがこれを使う。

### 受け入れ条件

- [ ] `app/core/security.py` に `get_current_user` 関数が定義されている
- [ ] `GET /api/auth/me` が Authorization ヘッダーから自分のユーザー情報を返す
- [ ] 無効 / 期限切れ / 未指定の token で 401 + `WWW-Authenticate: Bearer` ヘッダーが付く
- [ ] `/docs` の「Authorize」ボタンが表示される

### 仕様

```
GET /api/auth/me
Authorization: Bearer <token>

Response 200:
  { "id": 1, "student_id": "1234567890" }

Response 401:
  { "detail": "invalid token" }
  Header: WWW-Authenticate: Bearer
```

### 実装手順

#### 1. `app/core/security.py` に `get_current_user` を追記

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User

# /docs の Authorize ボタンにログインエンドポイントを紐づける
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="invalid token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise credentials_exc

    user = db.query(User).get(user_id)
    if not user:
        raise credentials_exc
    return user
```

#### 2. `app/api/auth.py` に `/me` を追加

```python
from app.core.security import get_current_user


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
```

#### 3. 動作確認

- `/docs` 右上の **Authorize** ボタンを押し、`POST /api/auth/login` で取得した token を入力
- `GET /api/auth/me` を叩く → 自分のユーザー情報が返る
- Authorize をクリアして再度叩く → 401

### 考え方のヒント

- **この関数は他の担当（BE-B系）が全員使う**。壊れると他タスクが全部止まる。実装と動作確認は丁寧に行う
- 他のエンドポイントでの使い方：
  ```python
  @router.get("/courses")
  def list_courses(current_user: User = Depends(get_current_user)):
      return {"user_id": current_user.id}
  ```
- `OAuth2PasswordBearer` の `tokenUrl` は /docs の UI のために設定する（実装上は使われない）

---

## BE-A5 POST /api/auth/logout

**担当**: Backend 担当A

### 目的

JWT はサーバー側に状態を持たないため、ログアウトのエンドポイントは実質何もしない。クライアント側が token を破棄するのが本来のログアウト処理。ただし API として存在させておくことで、クライアントから呼びやすくする／将来の拡張（blocklist、監査ログ）余地を残す。

### 受け入れ条件

- [ ] `POST /api/auth/logout` が 204 を返す
- [ ] 未認証で 401（`get_current_user` による認証必須）

### 仕様

```
POST /api/auth/logout
Authorization: Bearer <token>

Response 204: (body なし)
Response 401: { "detail": "..." }
```

### 実装手順

#### 1. `app/api/auth.py` に `logout` を追加

```python
from fastapi import Response


@router.post("/logout", status_code=204)
def logout(current_user: User = Depends(get_current_user)):
    # JWT はステートレスなのでサーバー側は何もしない
    # token 破棄はクライアント側の責務
    return Response(status_code=204)
```

#### 2. 動作確認

- `/docs` から `POST /api/auth/logout` を叩く → 204 を確認
- Authorize を外して叩く → 401 を確認

### 考え方のヒント

- 本当にサーバー側で token を無効化したいなら blocklist 方式（破棄された token_id を DB/Redis に保存し、毎リクエストでチェック）が必要。**ハッカソンのスコープ外**
- 「何もしないエンドポイント」に見えるが、認証ガードだけはしておく。未ログイン状態で logout が呼べるのは不自然
