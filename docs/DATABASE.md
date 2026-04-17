# データベースガイド

PostgreSQL + SQLAlchemy + Alembic の構成解説とセットアップ手順をまとめたガイドです。（AI作成）

---

## 目次

1. [技術スタック](#技術スタック)
2. [全体構成](#全体構成)
3. [ディレクトリ構成](#ディレクトリ構成)
4. [各ファイルの役割](#各ファイルの役割)
5. [セットアップ手順](#セットアップ手順)
6. [Modelの追加手順](#modelの追加手順)
7. [よく使うコマンド](#よく使うコマンド)
8. [トラブルシューティング](#トラブルシューティング)

---

## 技術スタック

| 層 | ツール | 役割 |
|---|---|---|
| DB本体 | PostgreSQL 16 | 本番・開発ともに同じ |
| ORM | SQLAlchemy 2.0 | Python ↔ DB のマッピング |
| ドライバ | psycopg 3 (`psycopg[binary]`) | SQLAlchemyからPostgresへ接続 |
| マイグレーション | Alembic | スキーマ変更の履歴管理 |
| 設定管理 | pydantic-settings | 環境変数の型安全な読み込み |

本番は Render Managed PostgreSQL を想定。`DATABASE_URL` 環境変数で接続先を切り替えるため、コード側に本番/開発の差異はない。

- ORM(Object-relational mapping)
    - DB の SQL を書かなくても、プログラム側からより簡単に SQL の発行をできる仲介プログラム
    - メリット
        - プログラムと DB の関係が疎結合 -> DBが変わってもプログラムを変えずに済む
    - デメリット
        - 複雑なSQLは難しい
        - ORMツール特有の書き方を覚える必要がある
- マイグレーション
    - DB の変更内容をファイルに記録し、その内容を実行して DB のスキーマを更新していく手法
    - メリット
        - 既に存在するデータを維持しながら、スキーマを安全に変更できる
        - DB が破損しても、スキーマやアプリ動作に必要な最低限のデータをすぐに復元できる
    - デメリット
        - 時間経過でマイグレーションファイルが増え続ける -> ファイル整理が必要

---

## 全体構成

```
┌─────────────┐        ┌──────────────┐       ┌──────────────┐
│  FastAPI    │ ─────> │  SQLAlchemy  │ ────> │  PostgreSQL  │
│  endpoint   │ Depends│  Session     │ psycopg│              │
└─────────────┘        └──────────────┘       └──────────────┘
                              ▲
                              │ Base.metadata
                              │
                       ┌──────────────┐       ┌──────────────┐
                       │   Models     │ <──── │   Alembic    │
                       │ (User, ...)  │ diff  │ migrations   │
                       └──────────────┘       └──────────────┘
```

- **リクエスト時**: FastAPI が `get_db()` 経由でセッションを取得 → Model経由でSQL発行
- **スキーマ変更時**: Modelを書き換え → `alembic revision --autogenerate` で差分検出 → `alembic upgrade head` で反映

---

## ディレクトリ構成

```
backend/
├── alembic/                 # マイグレーション関連
│   ├── env.py               # Alembic起動スクリプト（編集する）
│   ├── script.py.mako       # マイグレーションテンプレ（触らない）
│   └── versions/            # 生成されたマイグレーションファイル
│       └── xxxxx_create_users_table.py
├── alembic.ini              # Alembic設定ファイル
├── app/
│   ├── core/
│   │   └── config.py        # 環境変数を読み込むSettings
│   ├── db/
│   │   ├── base.py          # DeclarativeBase (Modelの親)
│   │   └── session.py       # engine, SessionLocal, get_db()
│   └── models/
│       └── user.py          # Userテーブル定義
└── pyproject.toml           # 依存関係
```

---

## 各ファイルの役割

### `compose.yml` — DBサービス定義

```yaml
db:
  image: postgres:16
  environment:
    POSTGRES_USER: app
    POSTGRES_PASSWORD: app
    POSTGRES_DB: app
  volumes:
    - pg-data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U app -d app"]
    interval: 5s
    timeout: 5s
    retries: 5
    start_period: 30s
```

- **`pg-data` volume**: コンテナを消してもDBデータが残る
- **`healthcheck`**: DBが接続可能か監視。`pg_isready`コマンドで確認
- **`depends_on.db.condition: service_healthy`**: appサービスはDBがhealthyになるまで起動を待つ

`app`サービスには `DATABASE_URL: postgresql+psycopg://app:app@db:5432/app` を設定。

- 形式: `postgresql+psycopg://USER:PASSWORD@HOST:PORT/DBNAME`
- `db` はcompose内のサービス名 = Dockerネットワーク上のホスト名
- `+psycopg` はSQLAlchemyに「psycopg3ドライバを使え」と指示

### `app/core/config.py` — 設定クラス

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )
    database_url: str
    cors_origins: str = ""

settings = Settings()  # type: ignore[call-arg]
```

- **`BaseSettings`**: 環境変数から自動で値を読む（属性名を大文字化して探す）
- **デフォルト値なし = 必須**。未設定なら起動時エラー
- **シングルトン**: モジュールインポート時に1回だけ `Settings()` を実行

### `app/db/base.py` — Model基底クラス

```python
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass
```

- 全Modelが `Base` を継承する
- `Base.metadata` に全テーブル情報が集約される → Alembicがこれを見て差分検出

### `app/db/session.py` — 接続管理

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

engine = create_engine(settings.database_url, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- **`engine`**: アプリ全体で1個だけ作る接続プール
- **`echo=True`** にすると実行SQLがログに出る（デバッグ用）
- **`autoflush=False`**: 明示的に `commit`/`flush` するまでDBへ送らない（意図しない書き込み防止）
- **`get_db()`**: FastAPIの依存注入用。`yield` でセッションを返し、リクエスト終了時に `close`

**使い方**:
```python
from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.session import get_db

@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()
```

### `app/models/user.py` — Model定義（SQLAlchemy 2.0スタイル）

```python
from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[str] = mapped_column(String(10), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

| 記法 | 意味 |
|---|---|
| `Mapped[int]` | NOT NULL の int カラム |
| `Mapped[int \| None]` | NULL 許可の int カラム |
| `mapped_column(primary_key=True)` | PK + 自動採番（int型の場合） |
| `String(32)` | VARCHAR(32) |
| `unique=True` | 重複不可の制約 |
| `index=True` | 検索用インデックス |
| `server_default=func.now()` | DB側で `CURRENT_TIMESTAMP` を生成 |
| `DateTime(timezone=True)` | タイムゾーン付き（Postgresでは `TIMESTAMPTZ`） |

**テーブル名の慣例**: `users` のように複数形にする。`user` は予約語と紛らわしいため避ける。

### `alembic.ini` — Alembic設定

生成されたままで使う。ただし **`sqlalchemy.url = driver://...` 行はコメントアウト** する。URLは `env.py` で環境変数から動的に設定するため。

### `alembic/env.py` — Alembic起動スクリプト

生成後に **3箇所** 編集する：

```python
# 1. import追加
from app.core.config import settings
from app.db.base import Base
from app.models import user  # noqa: F401

# 2. DB接続URLを動的設定
config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

# 3. target_metadata を Base.metadata に
target_metadata = Base.metadata
```

- **Modelのimportが必須**: importしないと `Base.metadata` にテーブルが登録されず、autogenerateが空になる
- **`# noqa: F401`**: 未使用import警告を抑止（実際は副作用でテーブル登録するためのimport）
- **新しいModelを追加したら、必ずここにimportを追加する**

---

## セットアップ手順

### 前提

- Docker + Docker Compose が動く環境
- VSCode Dev Container もしくは compose で `app` コンテナに入れる状態

### 1. 依存関係のインストール

`backend/pyproject.toml` に以下が含まれていることを確認：

```toml
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "sqlalchemy>=2.0",
    "psycopg[binary]>=3.2",
    "alembic>=1.13",
    "pydantic-settings>=2.5",
]
```

コンテナ内で：
```bash
cd backend
uv sync
```

### 2. コンテナ再起動
vscodeコンテナ内で`crtl + shift + p`で
`開発コンテナ：キャッシュなしのコンテナーのリビルド`
を選択

あるいは

プロジェクトルートで：
```bash
docker compose up -d --build
```

DBコンテナが `healthy` になるのを待つ：
```bash
docker compose ps
# db が (healthy) と表示されればOK
```

### 3. 設定クラス動作確認
コンテナ内（vscodeコンテナ内ターミナル）で
```bash
cd backend
uv run python -c "from app.core.config import settings; print(settings.database_url)"
```

→ `postgresql+psycopg://app:app@db:5432/app` が出ればOK。

### 4. DB接続確認

```bash
uv run python -c "from app.db.session import engine; print(engine.connect())"
```

→ 接続オブジェクトが表示されればOK。エラーが出たらDBが起動していないかURL誤り。

### 5. Model動作確認

```bash
uv run python -c "from app.models.user import User; print(User.__tablename__, User.__table__.columns.keys())"
```

→ `users ['id', 'student_id', 'password_hash', 'created_at']` が出ればOK。

### 6. Alembic 初期化（初回のみ）

```bash
cd backend
uv run alembic init alembic
```

→ `backend/alembic/` と `backend/alembic.ini` が生成される。

その後、前述の通り `alembic.ini` の `sqlalchemy.url` をコメントアウトし、`alembic/env.py` を3箇所編集する。

### 7. 初回マイグレーション生成

```bash
uv run alembic revision --autogenerate -m "create users table"
```

→ `backend/alembic/versions/xxxxx_create_users_table.py` が生成される。

中身を確認：`upgrade()` 内に `op.create_table("users", ...)` があればOK。

### 8. マイグレーション適用

```bash
uv run alembic upgrade head
```

### 9. テーブル確認

```bash
docker compose exec db psql -U app -d app -c "\dt"
```

→ `users` と `alembic_version` の2テーブルが見えれば完了。

---

## Modelの追加手順

新しいテーブルをDBに追加するときの標準フロー。

### 1. Modelファイルを作る

`backend/app/models/<name>.py` を作成。`Base` を継承する。

例: `quarter.py`
```python
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class Quarter(Base):
    __tablename__ = "quarters"

    id: Mapped[int] = mapped_column(primary_key=True)
    year: Mapped[int]
    term: Mapped[str]
```

### 2. `alembic/env.py` にimportを追加

**これを忘れるとAlembicがテーブルを検出しない**（autogenerateの結果が空になる）。

```python
from app.models import user, quarter  # noqa: F401
```

または個別に追加：
```python
from app.models import user      # noqa: F401
from app.models import quarter   # noqa: F401
```

### 3. マイグレーション生成

```bash
cd backend
uv run alembic revision --autogenerate -m "add quarters table"
```

→ `backend/alembic/versions/xxxxx_add_quarters_table.py` が生成される。

### 4. 生成ファイルを確認

開いて、`upgrade()` 内に意図通りの `op.create_table(...)` があるか確認する。

**autogenerateは完璧ではない**。以下は手動修正が必要なことがある：

| ケース | 挙動 | 対処 |
|---|---|---|
| カラム名の変更 | `DROP` + `ADD` になる（データが消える） | `op.alter_column` に書き換える |
| テーブル名の変更 | 同上 | `op.rename_table` に書き換える |
| データ移行 | 検出されない | `upgrade()` に手書きで追加 |

### 5. 適用

```bash
uv run alembic upgrade head
```

確認：
```bash
docker compose exec db psql -U app -d app -c "\dt"
```

---

## 既存Modelにカラムを追加する場合

同じ流れ。**Modelを編集** → `revision --autogenerate` → **ファイル確認** → `upgrade head`。

`env.py` のimportは既にあるので追加不要。

---

## 外部キー（リレーション）を張る場合

```python
from sqlalchemy import ForeignKey

class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    quarter_id: Mapped[int] = mapped_column(ForeignKey("quarters.id"))
```

- 参照先のテーブル（`users`, `quarters`）が**先に作られている**必要がある
- 同じマイグレーションに複数テーブルが入っていれば、Alembicが依存関係を解決して正しい順序で `create_table` を発行する
- 既存テーブルへFK追加なら、参照先が先にmigrateされていることを確認

---

## よく使うコマンド

### Alembic

```bash
# 現在のリビジョン確認
uv run alembic current

# マイグレーション履歴
uv run alembic history

# マイグレーション生成（Modelを編集した後）
uv run alembic revision --autogenerate -m "メッセージ"

# DBを最新に追従
uv run alembic upgrade head

# 1つ戻す
uv run alembic downgrade -1

# 空のマイグレーションを作る（データ移行など手書きしたいとき）
uv run alembic revision -m "メッセージ"
```

### psql（DB直接操作）

```bash
# DBに入る
docker compose exec db psql -U app -d app

# psql内のコマンド
\dt              # テーブル一覧
\d users         # usersテーブルの定義
\q               # 終了
SELECT * FROM users;
```

### DBリセット（全データ削除）

開発中にスキーマをリセットしたいとき：
```bash
docker compose down -v   # -v でvolumeも削除
docker compose up -d --build
cd backend && uv run alembic upgrade head
```

---

## トラブルシューティング

### `alembic revision --autogenerate` でテーブルが検出されない

**原因**: `env.py` でModelをimportしていない。

**解決**: 新Modelを作ったら `env.py` に `from app.models import <新model> # noqa: F401` を追加。

### `connection refused` エラー

**原因**: DBコンテナが起動していない、もしくはまだhealthyでない。

**解決**:
```bash
docker compose ps
docker compose logs db
```
でDBの状態を確認。起動待ちなら数十秒待つ。

### `DATABASE_URL` が見つからないエラー

**原因**: 環境変数が渡っていない。

**解決**: `compose.yml` の `app.environment` に `DATABASE_URL` があるか確認。コンテナを再起動（`docker compose up -d`）。

### Modelを変更したのに `autogenerate` で差分が出ない

**原因**: コンテナ内のPythonが古いコードをキャッシュしている、もしくは `env.py` で新しいカラム型がimportされていない。

**解決**: ターミナルを入り直す、もしくはコンテナ再起動。

### マイグレーションを間違えた

生成直後で未適用なら、ファイルを削除してやり直せる：
```bash
rm backend/alembic/versions/xxxxx_<メッセージ>.py
```

適用済みなら `alembic downgrade -1` で戻してからファイル削除。

---

## 本番デプロイ（Render）

Render Managed PostgreSQL を作成すると `DATABASE_URL` が自動で発行される。これを Render の Web Service 側の環境変数に設定すればローカルと同じコードで動く。

本番でのマイグレーション適用は、Render の Pre-Deploy Command または Web Serviceの起動時に：
```bash
alembic upgrade head
```
を実行する。

詳細は [DEPLOY.md](./DEPLOY.md) を参照。
