# 初回セットアップ
Macは多少異なるかも

## 主なディレクトリ構造


[README.md](/README.md)を参照


> 実際にコードを書くのは `backend/app/` と `frontend/src/` の中が中心になる。

---
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
.env.exampleの内容は開発コンテナ用。.envは各自適宜変更

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

**6. データベースのセットアップ**

DB コンテナは Dev Container で自動起動するが、**テーブルは自分で作成する必要がある**。
コンテナ内のターミナルで以下を実行する。

```bash
cd backend
uv run alembic upgrade head
```

これでマイグレーション（Git で共有されている DB スキーマ履歴）がローカル DB に反映される。

確認：

```bash
docker compose exec db psql -U app -d app -c "\dt"
```

`users` と `alembic_version` の2テーブルが表示されればOK。

詳細は [DATABASE.md](./DATABASE.md) を参照。

**7. 動作確認**

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
