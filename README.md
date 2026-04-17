# アプリ名

大学特化型カレンダー（時間割登録付き）

---
## ユーザーストーリー
- 既存のカレンダーアプリだと大学の学年暦がわからないので、個人の予定と大学の予定の把握がめんどくさい
- 時間割登録アプリ と カレンダーアプリ を統合することで、大学生のスケジュール管理を一括に

---
## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | TypeScript / React + FullCalendar|
| バックエンド | Python / FastAPI |
| データベース | PostgreSQL / SQLAlchemy / Alembic |
| デプロイ | Render |

---


## ディレクトリ構造

```
.
├── backend/                    # バックエンド（FastAPI）
│   ├── alembic/                # マイグレーション関連
│   │   ├── versions/           # マイグレーションファイル
│   │   ├── env.py              # Alembic 起動スクリプト
│   │   └── script.py.mako      # マイグレーションテンプレート
│   ├── app/
│   │   ├── api/                # ルーター（エンドポイント定義）
│   │   ├── core/               # 設定・共通処理
│   │   ├── db/                 # データベース接続
│   │   ├── models/             # SQLAlchemy の Model 定義
│   │   ├── schemas/            # リクエスト・レスポンスの型定義（Pydantic）
│   │   ├── services/           # ビジネスロジック
│   │   └── main.py             # アプリのエントリーポイント
│   ├── static/                 # フロントエンドのビルド成果物（デプロイ時）
│   ├── test/                   # テストコード
│   ├── alembic.ini             # Alembic 設定ファイル
│   ├── uv.lock
│   └── pyproject.toml
│
├── frontend/                   # フロントエンド（TypeScript + Vite）
│   ├── public/                 # 静的ファイル（画像など）
│   ├── src/
│   │   ├── components/         # 共通コンポーネント（Layout など）
│   │   ├── lib/                # ユーティリティ（API クライアントなど）
│   │   ├── pages/              # 各ページのコンポーネント
│   │   ├── types/              # 型定義
│   │   ├── App.tsx             # ルート定義
│   │   ├── constants.ts        # 定数
│   │   └── main.tsx            # TypeScript のエントリーポイント
│   ├── index.html              # HTML のエントリーポイント
│   └── package.json            # Node 依存パッケージの定義
│
├── docs/                       # 開発ドキュメント
├── scripts/                    # 開発用スクリプト
│   └── dev/
│       ├── start-backend.sh    # バックエンド起動
│       └── start-frontend.sh   # フロントエンド起動
├── docker/                     # Docker 設定
├── compose.yml                 # Docker Compose 設定
└── .devcontainer/              # Dev Container 設定
```


---

