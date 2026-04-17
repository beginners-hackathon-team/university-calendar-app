# Backend 共通準備タスク

先行タスク。これが終わらないと BE-A系 / BE-B系 が実装に入れない。

- [BE-0 残りのModel追加 + マイグレーション](#be-0-残りのmodel追加--マイグレーション)
- [BE-0.5 シードデータ投入](#be-05-シードデータ投入)

← [TASKS.md に戻る](../TASKS.md)

---

## BE-0 残りのModel追加 + マイグレーション

**担当**: Backend 1人（先行）

### 目的

時間割・カレンダー機能の土台となる5テーブル（`quarters`, `university_events`, `courses`, `course_dates`, `personal_events`）をDBに追加する。
現状は `users` のみ存在。これが終わらないと BE-B系 / FE-β,γ系 の実装に必要なテーブルが揃わない。

### 受け入れ条件

- [ ] `backend/app/models/` に以下のファイルが存在する
  - `quarter.py` / `course.py` / `course_date.py` / `personal_event.py` / `university_event.py`
- [ ] `backend/alembic/env.py` に全Modelの `import` が追加されている
- [ ] `uv run alembic upgrade head` がエラーなく完了する
- [ ] `docker compose exec db psql -U app -d app -c "\dt"` で全テーブルが表示される
  - `users`, `quarters`, `courses`, `course_dates`, `personal_events`, `university_events`, `alembic_version`

### 仕様

**列定義の正本は [DESIGN.md 3.1](../DESIGN.md#31-テーブル一覧) を参照。** 以下は実装に必要な一覧。

#### quarters

| カラム | 型 | 制約 |
|---|---|---|
| id | int | PK, 自動採番 |
| term | string | `Q1`〜`Q4` |
| year | string | 例: `"2026"` |
| start_date | date | |
| end_date | date | |

#### university_events

| カラム | 型 | 制約 |
|---|---|---|
| id | int | PK |
| name | string | 例: 「振替休日」「前期末試験」 |
| type | string | `holiday` / `exam` / `transfer` / `other` |
| date | date | |
| original_day | string? | `transfer` の場合のみ。`mon`〜`sun` |

#### courses

| カラム | 型 | 制約 |
|---|---|---|
| id | int | PK |
| user_id | int | FK → users.id |
| quarter_id | int | FK → quarters.id |
| name | string | 授業名 |
| room | string | 講義室 |
| teacher | string | 担当教員 |
| day_of_week | string | `mon`〜`sun` |
| period | int | 1〜6 |

#### course_dates

| カラム | 型 | 制約 |
|---|---|---|
| id | int | PK |
| course_id | int | FK → courses.id |
| date | date | |

#### personal_events

| カラム | 型 | 制約 |
|---|---|---|
| id | int | PK |
| user_id | int | FK → users.id |
| title | string | |
| date | date | |
| start_time | time | |
| end_time | time | |
| description | text? | NULL許可 |

### 実装手順

#### 1. Model ファイルを作成

1ファイル1クラス。雛形は [backend/app/models/user.py](../../backend/app/models/user.py)。

**SQLAlchemy 2.0 スタイルの基本形**（`quarter.py` の書き出し例）：

```python
from datetime import date
from sqlalchemy import String, Date
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Quarter(Base):
    __tablename__ = "quarters"

    id: Mapped[int] = mapped_column(primary_key=True)
    term: Mapped[str] = mapped_column(String(2))
    # year, start_date, end_date を同じ調子で追加する
```

**ForeignKey を張るとき**（`course.py` の例）：

```python
from sqlalchemy import ForeignKey

class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    quarter_id: Mapped[int] = mapped_column(ForeignKey("quarters.id"))
    # name, room, teacher, day_of_week, period を追加する
```

**NULL 許可カラム**（`personal_event.py` の `description` など）：

```python
from sqlalchemy import Text

description: Mapped[str | None] = mapped_column(Text)
```

**主な型のマッピング**：

| 仕様の型 | SQLAlchemy | import元 |
|---|---|---|
| `int` | 指定不要（`Mapped[int]` だけでOK） | - |
| `string` | `String(長さ)` | `from sqlalchemy import String` |
| `text` | `Text` | `from sqlalchemy import Text` |
| `date` | `Date` | `from sqlalchemy import Date` |
| `time` | `Time` | `from sqlalchemy import Time` |

#### 2. `alembic/env.py` に import を追加

既存：

```python
from app.models import user  # noqa: F401
```

↓ 全Modelをまとめて import するよう変更：

```python
from app.models import (  # noqa: F401
    user,
    quarter,
    course,
    course_date,
    personal_event,
    university_event,
)
```

**これを忘れると autogenerate の結果が空になる。** `# noqa: F401` は「未使用import警告を抑止」の意味（実際は副作用でテーブル登録している）。

#### 3. マイグレーションファイルを生成

```bash
cd backend
uv run alembic revision --autogenerate -m "add quarter/course/course_date/personal_event/university_event"
```

`backend/alembic/versions/xxxxx_add_*.py` が作成される。

#### 4. 生成ファイルを目視確認

開いて、`upgrade()` の中身を確認：

- `op.create_table("quarters", ...)` など **5つのテーブル** が生成されているか
- FK の順序（`users`, `quarters` が先。その後に `courses` など）が正しいか
- 意図しない `op.drop_table(...)` が入っていないか

もし想定と違えば、Modelを直してファイルを削除（未適用なので消してOK）→ 手順3 からやり直し。

#### 5. マイグレーションを適用

```bash
uv run alembic upgrade head
```

#### 6. テーブルを確認

```bash
docker compose exec db psql -U app -d app -c "\dt"
```

期待される出力（抜粋）：

```
 public | alembic_version    | table | app
 public | course_dates       | table | app
 public | courses            | table | app
 public | personal_events    | table | app
 public | quarters           | table | app
 public | universitity_events| table | app
 public | users              | table | app
```

### 考え方のヒント

- **テーブル作成順**: FK の参照先（`users`, `quarters`）が先に作られている必要がある。同じマイグレーションにまとめれば Alembic が依存関係を自動で解決して正しい順序で `create_table` を発行する
- **`course_dates` は空でOK**: 日付生成ロジックは [BE-B2] で実装する。ここではテーブル定義だけ作る
- **`type` 列の型**: `Enum` にすると DB 側でも制約がかかるが、まずは `String` で始める方が無難（Alembic の autogenerate が enum の変更を拾いにくい）
- **スキーマをリセットしたいとき**: `docker compose down -v && docker compose up -d --build` で volume ごと消せる → `alembic upgrade head` しなおし

### 参考

- [DATABASE.md](../DATABASE.md) — Model追加・Alembic の全手順
- [DESIGN.md 3](../DESIGN.md#3-データベース設計) — テーブル設計
- [backend/app/models/user.py](../../backend/app/models/user.py) — 既存 Model の記述例

---

## BE-0.5 シードデータ投入

（BE-0 完了後に着手）

### 目的

固定マスタデータを初期投入する。開発環境でカレンダー機能を動かすには、`quarters` と `university_events` にデータが入っていないとイベントが何も表示されない。
他メンバーが DB をリセットしても同じデータを再投入できる **再現可能な方法** でコミットすること。

### 受け入れ条件

- [ ] `quarters` に2026年 Q1〜Q4 の4件が入っている
- [ ] `university_events` に今学期分の大学独自の休日 / 振替日 / 試験期間 / インターバル / その他イベント が入っている
- [ ] 投入方法が再現可能（スクリプト or マイグレーションファイルとしてコミットされている）
- [ ] `docker compose exec db psql -U app -d app -c "SELECT count(*) FROM quarters;"` で件数が確認できる

### 仕様

#### quarters（4件）

| term | year | start_date | end_date |
|---|---|---|---|
| Q1 | 2026 | 2026-04-01 | 2026-06-10 |
| Q2 | 2026 | 2026-06-11 | 2026-09-30 |
| Q3 | 2026 | 2026-10-01 | 2026-12-08 |
| Q4 | 2026 | 2026-12-09 | 2027-03-31 |

※ 大学の学年暦を要確認。

#### university_events（例）

| name | type | date | original_day |
|---|---|---|---|
| 学園祭設営 | holiday | 2026-11-06 | NULL |
| 水曜授業（振替） | transfer | 2026-04-02 | wed |
| Q1試験 | exam | 2026-05-29 | NULL |

### 実装方針（いずれか選ぶ）

| 方式 | 向いている場面 |
|---|---|
| **Alembicデータmigration** | 本番でも自動投入したい。履歴管理したい |
| **Pythonスクリプト** (`backend/scripts/seed.py` 等) | 開発中に何度も流し直したい |

以下、どちらの方針でも使える実装手順を両方載せる。

### 実装手順

#### A. Python スクリプト方式

**1. `backend/scripts/seed.py` を新規作成**

骨格例：

```python
from datetime import date
from app.db.session import SessionLocal
from app.models.quarter import Quarter
from app.models.university_event import UniversityEvent


def seed_quarters(db):
    rows = [
        Quarter(term="Q1", year="2026",
                start_date=date(2026, 4, 1),
                end_date=date(2026, 6, 10)),
        # Q2〜Q4 を追加する
    ]
    for r in rows:
        # 冪等性: 既に存在すればスキップ
        exists = db.query(Quarter).filter_by(term=r.term, year=r.year).first()
        if not exists:
            db.add(r)


def seed_university_events(db):
    # 同様に書く（name でユニーク判定するなど）
    pass


def main():
    db = SessionLocal()
    try:
        seed_quarters(db)
        seed_university_events(db)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
```

**2. 実行**

```bash
cd backend
uv run python scripts/seed.py
```

**3. 確認**

```bash
docker compose exec db psql -U app -d app -c "SELECT * FROM quarters;"
```

#### B. Alembic データ migration 方式

**1. 空リビジョンを作成**

```bash
cd backend
uv run alembic revision -m "seed quarters and university_events"
```

`--autogenerate` は **つけない**（スキーマ変更ではないので）。

**2. 生成されたファイルを編集**

骨格例：

```python
# backend/alembic/versions/xxxxx_seed_quarters_and_university_events.py
from datetime import date
from alembic import op
import sqlalchemy as sa


def upgrade():
    quarters = sa.table(
        "quarters",
        sa.column("term", sa.String),
        sa.column("year", sa.String),
        sa.column("start_date", sa.Date),
        sa.column("end_date", sa.Date),
    )
    op.bulk_insert(quarters, [
        {"term": "Q1", "year": "2026",
         "start_date": date(2026, 4, 1),
         "end_date": date(2026, 6, 10)},
        # Q2〜Q4
    ])

    # university_events も同様に sa.table(...) と op.bulk_insert(...) を書く


def downgrade():
    op.execute("DELETE FROM quarters")
    op.execute("DELETE FROM university_events")
```

**3. 適用**

```bash
uv run alembic upgrade head
```

**4. 確認**

```bash
docker compose exec db psql -U app -d app -c "SELECT * FROM quarters;"
```

### 考え方のヒント

- **冪等性**: 同じシードを2回流しても重複エラーにならないこと
  - Python スクリプト: 「既存チェック後に insert」
  - Alembic: リビジョン単位で履歴管理されるので通常1回しか走らない（`downgrade` → `upgrade` し直したいなら `downgrade` で DELETE しておく）
- **日付型**: Python の `datetime.date(2026, 4, 1)` を渡す（文字列 `"2026-04-01"` だと型エラーになることがある）
- **実行場所**: コンテナ内の `backend/` ディレクトリ。`.env` / `DATABASE_URL` は Settings 経由で自動的に読まれる

### 参考

- [DATABASE.md「よく使うコマンド」](../DATABASE.md#よく使うコマンド)
- [DESIGN.md 3.1](../DESIGN.md#31-テーブル一覧) — `university_events` / `quarters` の列定義
