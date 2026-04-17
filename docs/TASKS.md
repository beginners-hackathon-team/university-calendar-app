# ハッカソン当日タスク一覧（Issue化前提）

## 分担方針
- **Backend × 2**: API/DB層。並行しやすいよう「認証系」と「データ系」で分ける
- **Frontend × 3**: 「認証/共通UI」「カレンダー」「時間割/個人イベント」で分ける

---

## Backend タスク

### 共通準備（先行、誰か1人）
- **[BE-0] 残りのModel追加 + マイグレーション**
  - `quarter`, `course`, `course_date`, `personal_event`, `university_event`
  - 参考: `docs/DATABASE.md` の「Modelの追加手順」
  - 完了条件: `alembic upgrade head` で全テーブル作成

- **[BE-0.5] シードデータ投入**
  - `quarters`（2026年Q1〜Q4）
  - `university_events`（今学期の休日/振替/試験期間等, 大学の学年暦参照）
  - 完了条件: psqlで件数確認

### 担当A: 認証系
- **[BE-A1] パスワードハッシュ + JWT ユーティリティ**
  - `app/core/security.py` に `hash_password`, `verify_password`, `create_access_token`, `decode_token`
  - 依存: `passlib[bcrypt]`, `python-jose[cryptography]`

- **[BE-A2] `POST /api/auth/register`**
  - 学籍番号重複時409

- **[BE-A3] `POST /api/auth/login`**
  - JWT発行

- **[BE-A4] `GET /api/auth/me` + `get_current_user` Depends**
  - Bearerトークン検証の共通依存を作る
  - 他のエンドポイントが全部これを使う

- **[BE-A5] `POST /api/auth/logout`**
  - JWTなのでサーバー側は実質何もしない。204返すだけでOK

### 担当B: データ系
- **[BE-B1] `GET/POST/PUT/DELETE /api/courses`**
  - `get_current_user` で自分のものだけ返す

- **[BE-B2] course_dates 自動生成ロジック**
  - design.md 4.1 の仕様（休日除外・振替追加）
  - `POST /api/courses` と `PUT /api/courses/{id}` で呼ぶ

- **[BE-B3] `GET/POST/GET/PUT/DELETE /api/personal-events`**

- **[BE-B4] `GET /api/calendar` 本実装**（現在はダミー）
  - design.md 4 のSQL3本を実装

- **[BE-B5] `GET /api/quarters`, `GET /api/university-events`**

---

## Frontend タスク

### 共通準備（先行、誰か1人）
- **[FE-0] React Router 導入 + レイアウト骨組み**
  - ヘッダー（カレンダー/時間割/ログアウト）
  - 未ログインならログイン画面にリダイレクト
  - ルート: `/login`, `/register`, `/`（カレンダー）, `/courses`（時間割）

- **[FE-0.5] API通信の共通化**
  - `src/lib/api.ts` で `fetch` ラッパー作成
  - Authorizationヘッダー自動付与
  - エラーハンドリング統一

### 担当α: 認証 + 共通UI
- **[FE-α1] ログイン画面** (`/login`)
- **[FE-α2] ユーザー登録画面** (`/register`)
- **[FE-α3] 認証状態管理**
  - Context or Zustand でログイン状態保持
  - `localStorage`にtoken保存
  - ログアウト処理

- **[FE-α4] 未ログイン時のガード**
  - 保護ルートの実装

### 担当β: カレンダー
- **[FE-β1] カレンダー画面の本実装**
  - 現状のmock統合を拡張
  - 3種類のイベント色分け（design.md 2.5）
  - 日付範囲を動的に取得（月/週を移動したら再fetch）

- **[FE-β2] 大学イベント表示**
  - 休日: 背景グレー
  - 試験期間: バナー
  - 振替日: ヘッダーに「月曜授業」

- **[FE-β3] カレンダーから個人イベント登録モーダル起動**
  - 日付クリック → 登録モーダル
  - イベントクリック → 詳細/編集モーダル

### 担当γ: 時間割 + 個人イベント
- **[FE-γ1] 時間割画面** (`/courses`)
  - 表形式（曜日×時限）で表示
  - 追加/編集/削除

- **[FE-γ2] 個人イベント登録モーダル**
- **[FE-γ3] 個人イベント詳細・編集モーダル**
- **[FE-γ4] 時間割未登録時の案内表示**（design.md 2.4）

---

## 依存関係（ざっくり）

```
BE-0（Model）──┬─→ BE-A系（認証）
               └─→ BE-B系（データ）

FE-0（Router/共通）──┬─→ FE-α系（認証UI）
                     ├─→ FE-β系（カレンダー）
                     └─→ FE-γ系（時間割/イベント）

BE-A2,A3 ─→ FE-α1,α2（認証API繋ぎ込み）
BE-B ────→ FE-β,γ（各画面の繋ぎ込み）
```
