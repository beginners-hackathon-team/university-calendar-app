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
├── backend/                  # バックエンド（FastAPI）
│   ├── app/
│   │   ├── alembic/          # マイグレーション
│   │   ├── api/              # ルーター（エンドポイント定義）
│   │   ├── core/             # 設定・共通処理
│   │   ├── db/               # データベース接続
│   │    schemas/          # リクエスト・レスポンスの型定義（Pydantic）
│   │   ├── services/         # ビジネスロジック
│   │   └── main.py           # アプリのエントリーポイント
│   ├── static/               # フロントエンドのビルド成果物（デプロイ時）
│   ├── test/                 # テストコード
│   ├── alembic.ini           
│   ├── uv.lock          
│   └── pyproject.toml        
│
├── frontend/                 # フロントエンド（TypeScript + Vite）
│   ├── public/               # 静的ファイル（画像など）
│   ├── src/
│   │   ├── types             #
│   │   └── main.ts           # TypeScript のエントリーポイント
│   ├── index.html            # HTML のエントリーポイント
│   └── package.json          # Node 依存パッケージの定義
│
├── docs/                     # 開発ドキュメント
├── scripts/                  # 開発用スクリプト
│   └── dev/
│       ├── start-backend.sh  # バックエンド起動
│       └── start-frontend.sh # フロントエンド起動
├── docker/                   # Docker 設定
├── compose.yml               # Docker Compose 設定
└── .devcontainer/            # Dev Container 設定
```

> 実際にコードを書くのは `backend/app/` と `frontend/src/` の中が中心になる。

---

## 初回セットアップ

Macは多少異なるかも

### 必要なもの

以下を事前にインストールしておく。

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Visual Studio Code](https://code.visualstudio.com/)
（Antigravityなどでも可）
- VSCode 拡張機能: [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)


### 手順

**1. リポジトリをクローンする**

```bash
git clone https://github.com/{組織名}/{リポジトリ名}.git
cd {リポジトリ名}
```

**2. ファイルをコピーする**

```bash
cp compose.override.yml.example compose.override.yml
cp .env.example .env
```
現時点では.envは空ファイル。今後使う可能性があるので

**3. Docker Desktop を起動する**

タスクバー（またはアプリ一覧）から Docker Desktop を起動し、クジラのアイコンが表示されるまで待つ。
WSLを使う場合は別途設定が必要

**4. VSCode でフォルダを開く**

```bash
code .
```

または VSCode の「ファイル → フォルダを開く」でクローンしたフォルダを選択する。

**5. Dev Container で開く**

VSCode の右下に通知が表示されたら「コンテナーで再度開く」をクリックする。

通知が出ない場合はコマンドパレット（`Ctrl+Shift+P` / `Cmd+Shift+P`）を開き、以下を実行する。

```
Dev Containers: Reopen in Container
```

初回は以下が自動で実行されるため、数分かかる。完了するまでそのまま待つ。

- Docker イメージのビルド
- Python 依存パッケージのインストール（`uv sync`）
- Node 依存パッケージのインストール（`npm install`）

> 手動でのビルドコマンドは不要。

**6. 動作確認**

コンテナが起動したら、VSCode のターミナルを2つ開いて以下を実行する。

ターミナル1（バックエンド）:
```bash
bash scripts/dev/start-backend.sh
```

ターミナル2（フロントエンド）:
```bash
bash scripts/dev/start-frontend.sh
```

ブラウザで http://localhost:5173 を開き、画面が表示されれば完了。

---

## 事前練習（Git の練習方法）（任意）

このリポジトリを fork して Git の操作を練習しておく。

### fork してクローンする

1. GitHub のリポジトリページ右上の「Fork」をクリック
2. 自分のアカウントに fork されたリポジトリをクローンする

```bash
git clone https://github.com/{自分のアカウント名}/{リポジトリ名}.git
cd {リポジトリ名}
```

### 練習メニュー

以下を順番にやってみる。詰まったら [docs/GIT.md](docs/GIT.md) を参照。

**1. Issue を立てる**

fork 先の GitHub リポジトリで「Issues → New issue」を開き、適当なタイトル（例：`練習用のIssue`）で Issue を作成する。Issue 番号（`#1` など）を確認しておく。

**2. feature ブランチを作成する**

```bash
git switch develop
git switch -c feature/#1-practice
```

**3. ファイルを編集してコミットする**

`README.md` など任意のファイルを少し編集して保存する。

```bash
git add README.md
git commit -m "docs: 練習用のコミット"
```

**4. push する**

```bash
git push origin feature/#1-practice
```

**5. PR を作成してマージする**

GitHub の fork 先リポジトリで「Compare & pull request」をクリックし、PR を作成する。説明欄に `Closes #1` を記載してマージまで行う。

**6. ブランチを削除する**

```bash
git switch develop
git branch -d feature/#1-practice
```

> fork したリポジトリでの練習なので、メインのリポジトリには影響しない。

---

## 開発ドキュメント
参考程度に

| ドキュメント | 内容 |
|---|---|
| [docs/GIT.md](docs/GIT.md) | Git / GitHub の使い方・ブランチ運用・コミット規則 |
| [docs/FRONTEND.md](docs/FRONTEND.md) | フロントエンドの開発フロー・Vite の使い方 |
| [docs/TYPESCRIPT.md](docs/TYPESCRIPT.md) | TypeScript の書き方・よくあるエラー |
| [docs/API.md](docs/API.md) | バックエンドとの通信方法・CORS 設定 |

## AIエージェント用ファイル

| ファイル | 内容 |
|---|---|
| [AGENTS.md](AGENTS.md) | AIエージェントへのルールなどを記載したファイル / Copilot, Codex など |
| [CLAUDE.md](CLAUDE.md) | Claude Code 用 |
| [DESIGN.md](DESIGN.md) | AIエージェントのためのデザイン仕様を記載したファイル |
