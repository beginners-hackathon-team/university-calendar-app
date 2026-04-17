# Backend データ系タスク（担当B）

BE-0 / BE-0.5 / BE-A1 / BE-A4 が完了していること（`get_current_user` を使うため）。

- [BE-B1 GET/POST/PUT/DELETE /api/courses](#be-b1-getpostputdelete-apicourses)
- [BE-B2 course_dates 自動生成ロジック](#be-b2-course_dates-自動生成ロジック)
- [BE-B3 GET/POST/GET/PUT/DELETE /api/personal-events](#be-b3-getpostgetputdelete-apipersonal-events)
- [BE-B4 GET /api/calendar 本実装](#be-b4-get-apicalendar-本実装)
- [BE-B5 GET /api/quarters, GET /api/university-events](#be-b5-get-apiquarters-get-apiuniversity-events)

← [TASKS.md に戻る](../TASKS.md)

---

## BE-B1 GET/POST/PUT/DELETE /api/courses

**担当**: Backend 担当B

### 目的

ユーザーが自分の時間割科目を登録・閲覧・編集・削除できる CRUD API を作る。他人の時間割は絶対に操作できないようにする。

### 受け入れ条件

- [ ] 4つのエンドポイント（一覧 / 追加 / 更新 / 削除）が `/docs` から叩ける
- [ ] すべて認証必須（未ログインで 401）
- [ ] 自分の `user_id` に紐づく course のみ返る / 操作できる
- [ ] 他人の course_id を指定しても 404（存在しない扱い）
- [ ] `POST` / `PUT` の成功後、[BE-B2] で実装する `course_dates` 再生成が呼ばれる（BE-B2 未完なら TODO コメントで残す）

### 仕様

```
GET    /api/courses              → 200 [CourseResponse]
POST   /api/courses              → 201 CourseResponse
PUT    /api/courses/{id}         → 200 CourseResponse
DELETE /api/courses/{id}         → 204
```

Pydantic スキーマは既存 [schemas/course.py](../../backend/app/schemas/course.py)（`CourseCreate`, `CourseUpdate`, `CourseResponse`）を使う。

Model は [BE-0] で作成した `Course`。

### 実装手順

#### 1. `app/api/courses.py` を新規作成

骨格：

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.course import Course
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse
from app.core.security import get_current_user

router = APIRouter(prefix="/api/courses", tags=["courses"])


@router.get("", response_model=list[CourseResponse])
def list_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Course).filter_by(user_id=current_user.id).all()


@router.post("", response_model=CourseResponse, status_code=201)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = Course(**payload.model_dump(), user_id=current_user.id)
    db.add(course)
    db.commit()
    db.refresh(course)
    # TODO: BE-B2 の course_dates 生成ロジックを呼ぶ
    return course


# PUT, DELETE も同様。必ず user_id でフィルタする
```

#### 2. 共通ヘルパー（推奨）

`PUT` / `DELETE` で「自分の course か」を確認するクエリが重複するのでヘルパー化する：

```python
def get_own_course(course_id: int, db: Session, current_user: User) -> Course:
    course = (
        db.query(Course)
        .filter_by(id=course_id, user_id=current_user.id)
        .first()
    )
    if not course:
        raise HTTPException(status_code=404, detail="course not found")
    return course
```

#### 3. `main.py` にルーターを登録

```python
from app.api import calendar, auth, courses
app.include_router(courses.router)
```

#### 4. 動作確認

1. ログインして token を取得
2. `/docs` の Authorize に設定
3. `POST /api/courses` で登録 → `GET /api/courses` で取得できることを確認
4. 別ユーザーでログインして、他人の course_id を `PUT` / `DELETE` → 404 になることを確認

### 考え方のヒント

- **必ず `user_id == current_user.id` でフィルタする**。付け忘れると他人の course を操作できてしまう
- 他人のアクセスに対して 403 (Forbidden) と 404 (Not Found) どちらを返すかは設計判断。**404 の方が情報漏洩が少ない**（存在自体を隠せる）
- `CourseCreate.model_dump()` で Pydantic モデルを dict に変換して、`**` で SQLAlchemy モデルに展開

---

## BE-B2 course_dates 自動生成ロジック

**担当**: Backend 担当B（BE-B1 の後）

### 目的

「毎週月曜3限」のような course 登録から、学期中に実際にその授業がある **具体的な日付リスト** (`course_dates`) を生成する。大学独自の休日は除外し、振替日は追加する。

### 受け入れ条件

- [ ] `POST /api/courses` 成功後、対応する `course_dates` が複数件生成されている
- [ ] `PUT /api/courses/{id}` 成功後、古い `course_dates` は削除され新しい日付で再生成されている
- [ ] `university_events.type = 'holiday'` に該当する日付は除外されている
- [ ] `university_events.type = 'transfer'` で `original_day` が一致する日付が追加されている
- [ ] `DELETE /api/courses/{id}` で `course_dates` もカスケード削除される

### 仕様

ロジックは [DESIGN.md 4.1](../DESIGN.md#41-course_dates-の生成ロジック) 参照。

**入力**: `courses` レコード1件（`quarter_id`, `day_of_week`）

**処理**:
1. `quarters` から `start_date`, `end_date` を取得
2. 期間内で `day_of_week` に該当する日付を全列挙
3. `holiday` を除外
4. `transfer` で `original_day == course.day_of_week` の日付を追加
5. 結果を `course_dates` にまとめて INSERT

**出力**: `course_dates` レコード複数件

### 実装手順

#### 1. `app/services/` ディレクトリを作成（まだ無ければ）

```bash
mkdir -p backend/app/services
touch backend/app/services/__init__.py
```

#### 2. `app/services/course_dates.py` を新規作成

骨格：

```python
from datetime import timedelta
from sqlalchemy.orm import Session
from app.models.quarter import Quarter
from app.models.university_event import UniversityEvent
from app.models.course_date import CourseDate
from app.models.course import Course


# "mon"〜"sun" を Python の weekday (0=月〜6=日) に対応付ける
DAY_TO_WEEKDAY = {
    "mon": 0, "tue": 1, "wed": 2, "thu": 3,
    "fri": 4, "sat": 5, "sun": 6,
}


def generate_course_dates(db: Session, course: Course) -> list[CourseDate]:
    # 1. quarter の期間を取得
    quarter = db.query(Quarter).get(course.quarter_id)
    if quarter is None:
        return []

    target_weekday = DAY_TO_WEEKDAY[course.day_of_week]

    # 2. 期間内の該当曜日を列挙
    dates: set = set()
    d = quarter.start_date
    while d <= quarter.end_date:
        if d.weekday() == target_weekday:
            dates.add(d)
        d += timedelta(days=1)

    # 3. 休日を除外
    holidays = {
        row.date
        for row in db.query(UniversityEvent)
        .filter(UniversityEvent.type == "holiday")
        .filter(UniversityEvent.date.between(quarter.start_date, quarter.end_date))
        .all()
    }
    dates -= holidays

    # 4. 振替日を追加
    transfers = (
        db.query(UniversityEvent)
        .filter(UniversityEvent.type == "transfer")
        .filter(UniversityEvent.original_day == course.day_of_week)
        .filter(UniversityEvent.date.between(quarter.start_date, quarter.end_date))
        .all()
    )
    for t in transfers:
        dates.add(t.date)

    # 5. CourseDate に変換して返す（INSERT は呼び出し側で）
    return [CourseDate(course_id=course.id, date=d) for d in sorted(dates)]


def regenerate_for_course(db: Session, course: Course) -> None:
    # 更新時は一度全消ししてから再生成
    db.query(CourseDate).filter_by(course_id=course.id).delete()
    rows = generate_course_dates(db, course)
    db.add_all(rows)
    db.commit()
```

#### 3. [BE-B1] の `POST` / `PUT` から呼び出す

```python
from app.services.course_dates import regenerate_for_course

@router.post("", response_model=CourseResponse, status_code=201)
def create_course(payload, db, current_user):
    # ...省略（course 作成）
    db.commit()
    db.refresh(course)
    regenerate_for_course(db, course)   # ← ここ
    return course
```

#### 4. カスケード削除の設定

`course_dates.course_id` に `ondelete="CASCADE"` を付ける。Model側：

```python
# backend/app/models/course_date.py
from sqlalchemy import ForeignKey

class CourseDate(Base):
    __tablename__ = "course_dates"
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE")
    )
    date: Mapped[date]
```

Model を変更したら再マイグレーション：

```bash
cd backend
uv run alembic revision --autogenerate -m "add cascade delete on course_dates"
uv run alembic upgrade head
```

#### 5. 動作確認

1. `POST /api/courses` で月曜3限を Q1 に登録
2. DBで確認：
   ```bash
   docker compose exec db psql -U app -d app -c \
     "SELECT date FROM course_dates WHERE course_id = 1 ORDER BY date;"
   ```
3. [BE-0.5] でシードした holiday / transfer が正しく反映されているか検算
4. `DELETE /api/courses/1` 後、`course_dates` も消えていることを確認

### 考え方のヒント

- `date.weekday()` は **月曜=0 〜 日曜=6**（Sundayが0ではない）
- 4ヶ月分でも日数は約120。毎回ループ計算で十分速い。DB 側で計算する必要なし
- 更新時に古い `course_dates` を消し忘れると、古い日付が残ってダブる
- 計算結果の順序が安定するよう `sorted(dates)` する（テストや目視確認がしやすい）

---

## BE-B3 GET/POST/GET/PUT/DELETE /api/personal-events

**担当**: Backend 担当B

### 目的

個人の予定（バイト・約束など）の CRUD。構造は BE-B1 とほぼ同じ。

### 受け入れ条件

- [ ] 5つのエンドポイント（一覧 / 追加 / 詳細 / 更新 / 削除）が動く
- [ ] 認証必須、自分の `user_id` 分のみ操作可能
- [ ] 一覧 API は `?start=...&end=...` で期間絞り込みができる

### 仕様

```
GET    /api/personal-events?start=2026-04-01&end=2026-04-30
  → 200 [PersonalEventResponse]

POST   /api/personal-events
  → 201 PersonalEventResponse

GET    /api/personal-events/{id}
  → 200 PersonalEventResponse

PUT    /api/personal-events/{id}
  → 200 PersonalEventResponse

DELETE /api/personal-events/{id}
  → 204
```

Pydantic スキーマは既存 [schemas/personal_event.py](../../backend/app/schemas/personal_event.py) を使用。

### 実装手順

#### 1. `app/api/personal_events.py` を新規作成

BE-B1 のパターンと同じ。一覧の期間絞り込みだけ例示：

```python
from datetime import date as date_type
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.personal_event import PersonalEvent
from app.schemas.personal_event import (
    PersonalEventCreate, PersonalEventUpdate, PersonalEventResponse,
)
from app.core.security import get_current_user

router = APIRouter(prefix="/api/personal-events", tags=["personal-events"])


@router.get("", response_model=list[PersonalEventResponse])
def list_events(
    start: date_type | None = None,
    end: date_type | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(PersonalEvent).filter_by(user_id=current_user.id)
    if start is not None:
        q = q.filter(PersonalEvent.date >= start)
    if end is not None:
        q = q.filter(PersonalEvent.date <= end)
    return q.order_by(PersonalEvent.date, PersonalEvent.start_time).all()


# POST / GET(detail) / PUT / DELETE は BE-B1 のパターンで書く
```

#### 2. `main.py` にルーター登録

#### 3. 動作確認

- `/docs` から 5エンドポイントを叩いて確認
- 期間外の日付は `GET /api/personal-events` に出ないこと

### 考え方のヒント

- BE-B1 とほぼ同じ実装になる。コピーして読み替えるのが早い
- `description` は Optional。リクエストで省略可（`PersonalEventBase` で `str | None = None`）
- `GET {id}` は BE-B1 の `get_own_course` と同じパターンで「自分の ID か」をチェックする

---

## BE-B4 GET /api/calendar 本実装

**担当**: Backend 担当B（BE-B1/B2/B3 完了後、または並行可能）

### 目的

現在ダミー実装の [backend/app/api/calendar.py](../../backend/app/api/calendar.py) を DB 参照に置き換える。フロントはこの1本のAPIでカレンダー表示用のデータを全て取得する。

### 受け入れ条件

- [ ] ダミーデータが削除されている
- [ ] 認証必須（`get_current_user` を追加）
- [ ] 指定期間内の course（時間割）/ personal_event / university_event が返る
- [ ] 時間割は `course_dates` をベースに `courses` の情報と結合して返す

### 仕様

```
GET /api/calendar?start=2026-04-01&end=2026-04-30
Authorization: Bearer <token>

Response 200: CalendarResponse
  {
    courses: [{ course_id, name, room, teacher, date, period }],
    personal_events: [{ id, title, date, start_time, end_time }],
    university_events: [{ id, name, date, type }]
  }
```

レスポンススキーマは既存 [schemas/calendar.py](../../backend/app/schemas/calendar.py)。

SQL の参考は [DESIGN.md 4「カレンダー集約API のSQL例」](../DESIGN.md#41-course_dates-の生成ロジック)。

### 実装手順

#### 1. [app/api/calendar.py](../../backend/app/api/calendar.py) を書き換え

骨格：

```python
from datetime import date as date_type
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.course import Course
from app.models.course_date import CourseDate
from app.models.personal_event import PersonalEvent
from app.models.university_event import UniversityEvent
from app.schemas.calendar import (
    CalendarResponse, CalendarCourse,
    CalendarPersonalEvent, CalendarUniversityEvent,
)

router = APIRouter(prefix="/api", tags=["calendar"])


@router.get("/calendar", response_model=CalendarResponse)
def get_calendar(
    start: date_type,
    end: date_type,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. 時間割: course_dates を courses と JOIN し、自分のもの
    course_rows = (
        db.query(CourseDate, Course)
        .join(Course, CourseDate.course_id == Course.id)
        .filter(Course.user_id == current_user.id)
        .filter(CourseDate.date.between(start, end))
        .all()
    )
    courses = [
        CalendarCourse(
            course_id=c.id, name=c.name, room=c.room, teacher=c.teacher,
            date=cd.date, period=c.period,
        )
        for cd, c in course_rows
    ]

    # 2. 個人イベント
    personal_rows = (
        db.query(PersonalEvent)
        .filter_by(user_id=current_user.id)
        .filter(PersonalEvent.date.between(start, end))
        .all()
    )
    personal_events = [
        CalendarPersonalEvent(
            id=e.id, title=e.title, date=e.date,
            start_time=e.start_time, end_time=e.end_time,
        )
        for e in personal_rows
    ]

    # 3. 大学イベント（全ユーザー共通）
    uni_rows = (
        db.query(UniversityEvent)
        .filter(UniversityEvent.date.between(start, end))
        .all()
    )
    university_events = [
        CalendarUniversityEvent(id=u.id, name=u.name, date=u.date, type=u.type)
        for u in uni_rows
    ]

    return CalendarResponse(
        courses=courses,
        personal_events=personal_events,
        university_events=university_events,
    )
```

#### 2. 動作確認

事前に course / personal_event / university_event にデータが入っていること（BE-0.5 シード + BE-B1 / B3 で作成）。

`/docs` から `GET /api/calendar?start=2026-04-01&end=2026-04-30` を叩き、3種類のイベントが返ってくることを確認。

### 考え方のヒント

- **3本のクエリを1本の大きな JOIN にしない**。読みやすさ・保守性を優先する
- `CourseDate` と `Course` を JOIN するときは `date` と `period` の両方が必要なので 2テーブルから列を取る
- 日付範囲は `between(start, end)` で両端含む
- フロントはこの1本で済むので、フロント側の fetch 実装が楽になる

---

## BE-B5 GET /api/quarters, GET /api/university-events

**担当**: Backend 担当B

### 目的

マスタデータの読み取り API。時間割登録画面でのクォータ選択、カレンダー側での大学イベント取得に使う。

### 受け入れ条件

- [ ] `GET /api/quarters` が全 quarter を返す
- [ ] `GET /api/university-events?start=...&end=...` が期間で絞り込める
- [ ] 認証必須

### 仕様

```
GET /api/quarters
  → 200 [{ id, term, year, start_date, end_date }]

GET /api/university-events?start=2026-04-01&end=2026-04-30
  → 200 [{ id, name, date, type, original_day }]
```

### 実装手順

#### 1. Pydantic スキーマを追加

現状 `quarter` / `university_event` の schema は存在しないので新規作成。

`app/schemas/quarter.py`:

```python
from datetime import date
from pydantic import BaseModel


class QuarterResponse(BaseModel):
    id: int
    term: str
    year: str
    start_date: date
    end_date: date

    class Config:
        from_attributes = True  # ORM オブジェクトから変換可能にする
```

`app/schemas/university_event.py`:

```python
from datetime import date
from typing import Literal
from pydantic import BaseModel


class UniversityEventResponse(BaseModel):
    id: int
    name: str
    date: date
    type: Literal["holiday", "exam", "transfer", "interval", "other"]
    original_day: str | None = None

    class Config:
        from_attributes = True
```

#### 2. `app/api/masters.py` を新規作成

```python
from datetime import date as date_type
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.quarter import Quarter
from app.models.university_event import UniversityEvent
from app.schemas.quarter import QuarterResponse
from app.schemas.university_event import UniversityEventResponse

router = APIRouter(prefix="/api", tags=["masters"])


@router.get("/quarters", response_model=list[QuarterResponse])
def list_quarters(
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),  # 認証のみ
):
    return db.query(Quarter).order_by(Quarter.year, Quarter.term).all()


@router.get("/university-events", response_model=list[UniversityEventResponse])
def list_university_events(
    start: date_type | None = None,
    end: date_type | None = None,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    q = db.query(UniversityEvent)
    if start is not None:
        q = q.filter(UniversityEvent.date >= start)
    if end is not None:
        q = q.filter(UniversityEvent.date <= end)
    return q.order_by(UniversityEvent.date).all()
```

#### 3. `main.py` にルーター登録

```python
from app.api import calendar, auth, courses, personal_events, masters
app.include_router(masters.router)
```

#### 4. 動作確認

- `/docs` から `GET /api/quarters` → [BE-0.5] でシードしたクォータが全件返る
- `GET /api/university-events?start=2026-04-01&end=2026-04-30` → 期間内の大学イベントが返る

### 考え方のヒント

- `_: object = Depends(get_current_user)` は「値は使わないが認証チェックだけ通したい」の書き方
- master データは全ユーザー共通。`user_id` でフィルタしない
- 今回はプレフィックスを `/api` にして 2つのエンドポイントを同じファイルで扱った。別ファイルに分けたい場合はそれぞれに `prefix="/api/quarters"` などを付ければOK
