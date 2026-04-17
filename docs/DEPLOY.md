# デプロイ手順メモ
## 前提
- Renderにデプロイ済み
- リモートリポジトリのmainブランチへのプッシュ（develop->mainへのマージ）でデプロイ

### 単一コンテナ
- フロントのビルドの出力である静的ファイルをバックエンドのstatic/に入れて、バックエンドのみコンテナ起動
### 別々デプロイと比較
| 観点 | 単一コンテナ | 別々デプロイ|
|----|----|----|
| Renderサービス数 | 1個 | 2個 |
| CORS設定 | 不要 | 必要 |
| 環境変数管理 | 1か所 | 2か所 |
| フロント単独再デプロイ | 不可（全体リビルド）| 可（高速なCDN反映）|
| ビルド時間 | やや長い | 短い |
| フロント配信速度 | サーバー経由 | CDN(高速) |

- CORSのデバッグなどがいらない
- URL管理が楽（フロントは/api/...のみ本番URLを意識しなくていい）
- 本番運用でフロントの変更が頻繁なら別々がいい
- UXを意識するなら別々（配信速度から）

### 小規模で短期間なら単一コンテナが楽

---
## 初回Renderセットアップ（1度だけ）

### 1. PostgreSQL作成
- Render → New → PostgreSQL
- Plan: Free, Version: 16
- Region: Singapore or Oregon（Web Serviceと揃える）
- 作成後、Internal Database URL をメモ

### 2. DATABASE_URL の driver 指定に書き換え
Renderが発行する URL は driver 指定が無いので、pydantic向けに置換が必要:
```
postgresql://xxx:yyy@host/db
↓
postgresql+psycopg://xxx:yyy@host/db
```

### 3. Web Service作成
- Render → New → Web Service
- リポジトリ選択 → Branch: `main`
- Runtime: **Docker**
- Dockerfile Path: `docker/prod/Dockerfile`
- Build Context: `.`
- Region: **DBと同じ**（Internal URL使用のため必須）
- Plan: Free

### 4. 環境変数を設定

| Key | Value |
|---|---|
| `DATABASE_URL` | 上記で書き換えた Internal URL |
| `JWT_SECRET_KEY` | `python -c "import secrets; print(secrets.token_urlsafe(32))"` の出力 |
| `CORS_ORIGINS` | 空欄（同一オリジンなので不要） |

### 5. Auto-Deploy 確認
Settings → Build & Deploy → Auto-Deploy: **Yes**, Branch: `main`
→ 以降 `main` への push で自動再デプロイ

### 6. デプロイ確認
- `https://<service-name>.onrender.com/` でフロントが表示
- `/api/health` で `{"status":"ok"}`
- 初回ビルドは 5〜10分

---

## 手順

### 1. developの最新を取り込む

```bash
git switch develop
git pull origin develop
```

### 2. ローカルで動作確認

```bash
# （必要なら）developブランチでビルド
docker build -f docker/prod/Dockerfile -t calendar-app:prod .

# コンテナ起動
docker run --rm -p 8001:8000 \
  --network $(basename $PWD | tr '[:upper:]' '[:lower:]')_default \
  -e DATABASE_URL=postgresql+psycopg://app:app@db:5432/app \
  -e JWT_SECRET_KEY=local-test-secret \
  calendar-app:prod
```
localhost:8001 にアクセスし動作確認

### 3. エラーがあれば編集してコミット・プッシュ

```bash
git add path/to/file
git commit -m "comment"
git push origin develop
```
-> 動作確認

### 4. PRを作成してマージ
リモートのdevelop -> main へのPRマージ

### 5. Renderのデプロイを確認