# 設計ドキュメント（仮）

大学の学年歴に特化したカレンダーアプリの設計。

---

## 1. 要件定義

### 1.1 ユーザーストーリー

- 既存のカレンダーアプリだと大学の学年暦に対応していないので、カレンダーアプリと学年暦の両方を見る必要があるのが不便。
- 登録した時間割を学年暦に合ったスケジュール（大学独自の休日の時は休み、振替日に授業）で一目でわかる。
- 大学の授業の予定と個人の予定を一目で確認したい。

### 1.2 機能一覧

- ユーザー登録
- ユーザーログイン / ログアウト
- 時間割登録（1〜6限）
- 時間割の編集・削除
- 個人イベント登録
- 個人イベントの編集・削除
- カレンダー表示（月表示 / 週表示 / 日表示）
- 大学独自イベントのカレンダー上への自動反映

以下余裕があれば
- Gooleアカウントでの登録
- Gmailから登録した授業のメールを取得して、ユーザーに知らせる（本番公開にはGoogle審査が必要、ローカルだけでも）

### 1.3 スコープ外

- 複数大学の対応（1大学のみ）
- モバイルアプリ対応（WebアプリのみでOK。ブラウザのレスポンシブ対応はする）
- 授業データの自動取得（シラバス連携など）
- 複数ユーザーでの予定共有
- 通知機能（授業開始前のリマインドなど）
- 管理者による大学イベント登録画面（事前にSQLでシードする）

---

## 2. 画面設計

### 2.1 画面一覧

| 画面 | 内容 |
|---|---|
| ログイン画面 | 学籍番号・パスワードでログイン |
| ユーザー登録画面 | 学籍番号・パスワードで新規登録 |
| カレンダー画面（メイン） | 月 / 週（デフォルト） / 日 表示切替。イベント追加可 |
| 時間割画面 | 表形式で時間割を登録・編集・削除 |
| 個人イベント登録画面 | カレンダーから日時を選んで登録 |
| 個人イベント詳細・編集画面 | カレンダー上のイベントをクリックで詳細表示、編集可 |

### 2.2 画面遷移

```
[ユーザー登録] → [ログイン] → [カレンダー（メイン）] → [時間割画面]
                                    │
                                    ├─→ [個人イベント詳細・編集画面]（モーダル）
                                    └─→ [個人イベント登録画面]（モーダル）
```

### 2.3 ナビゲーション

- ヘッダー（全画面共通）
  - カレンダー
  - 時間割
  - ログアウト

### 2.4 初回ログイン後の動線

- 時間割が未登録の場合、「時間割を登録しましょう」の案内を表示。

### 2.5 カレンダーでの表示ルール

| 種類 | 表示 |
|---|---|
| 時間割 | 青色、時限単位のブロック |
| 個人イベント | 緑色、時刻範囲で表示 |
| 大学イベント（休日） | 日全体をグレー色、背景色変更 |
| 大学イベント（テスト期間） | 期間全体にバナー表示（オレンジ色） |
| 大学イベント（振替日） | その日のヘッダーに「月曜授業」と表示（赤色） |
| 大学イベント（その他） | その日のヘッダーに「学園祭」などと表示 |

---

## 3. データベース設計

PostgreSQL（Renderのマネージドサービス）を使用。

### 3.1 テーブル一覧

#### users（ユーザー情報）

| カラム | 型 | 備考 |
|---|---|---|
| id | PK | 自動採番 |
| student_id | string | 学籍番号（ユニーク） |
| password_hash | string | ハッシュ化したパスワード |
| created_at | timestamp | 作成日時 |

#### university_events（大学独自イベント）

休日・振替日・インターバル・テスト期間・履修登録期間・学園祭など。事前にSQLでシードする。

| カラム | 型 | 備考 |
|---|---|---|
| id | PK | |
| name | string | 例：「振替休日」「前期末試験」「学園祭」 |
| type | string | `holiday` / `exam` / `transfer` / `other` など |
| date | date | イベントの日付 |
| original_day | string? | `transfer` の場合、振替元の曜日（例：`mon`） |

#### quarters（クォータ期間）

| カラム | 型 | 備考 |
|---|---|---|
| id | PK | |
| term | string | Q1〜Q4 |
| year | string | |
| start_date | date | |
| end_date | date | |

#### courses（ユーザーが登録した授業）

| カラム | 型 | 備考 |
|---|---|---|
| id | PK | |
| user_id | FK → users.id | 特定のユーザーに紐づく |
| name | string | 授業名 |
| room | string | 講義室 |
| teacher | string | 先生名 |
| day_of_week | string | `mon`〜`sun` |
| period | int | 1〜6 |
| quarter_id | FK → quarters.id | |

#### course_dates（授業の開催日、事前展開）

| カラム | 型 | 備考 |
|---|---|---|
| id | PK | |
| course_id | FK → courses.id | |
| date | date | 実際の開催日 |

#### personal_events（個人イベント）

| カラム | 型 | 備考 |
|---|---|---|
| id | PK | |
| user_id | FK → users.id | 特定のユーザーに紐づく |
| title | string | |
| date | date | |
| start_time | time | |
| end_time | time | |
| description | text? | 任意 |

### 3.2 平日・祝日の扱い

日本の祝日はプログラム（ライブラリ）で計算し、DBには持たない。DBに持つのは大学独自のイベントのみ。

---

## 4. ビジネスロジック

### 4.1 course_dates の生成ロジック

`POST /api/courses` が呼ばれたとき、バックエンドで以下を実行する：

1. `courses` テーブルに1件INSERT。
2. `courses.quarter_id` から `quarters` の期間を取得（例：2026-04-01 〜 2026-05-31）。
3. 期間内で `courses.day_of_week` に該当する日付を全列挙。
4. `university_events` を参照して調整：
   - 期間内の `holiday` → 除外。
   - 期間内の `transfer` で `original_day` が一致するもの → 追加。
5. 残った日付を `course_dates` にINSERT。

#### 例

月曜3限の授業（Q1 = 2026-04-01〜2026-05-31）の場合：

```
月曜日: 4/6, 4/13, 4/20, 4/27, 5/4, 5/11, 5/18, 5/25
  - 5/4（みどりの日の振替）→ 除外
  - 5/2（土、月曜振替）    → 追加

結果: 4/6, 4/13, 4/20, 4/27, 5/2, 5/11, 5/18, 5/25
```

#### SQL例

**① クォータ期間を取得**

```sql
SELECT start_date, end_date
FROM quarters
WHERE id = :quarter_id;
```

**② 期間内の休日（除外対象）を取得**

```sql
SELECT date
FROM university_events
WHERE type = 'holiday'
  AND date BETWEEN :start_date AND :end_date;
```

**③ 期間内の振替日（追加対象）を取得**

```sql
SELECT date
FROM university_events
WHERE type = 'transfer'
  AND original_day = :day_of_week
  AND date BETWEEN :start_date AND :end_date;
```

**④ 生成した日付を course_dates にまとめてINSERT**

```sql
INSERT INTO course_dates (course_id, date)
VALUES
  (:course_id, '2026-04-06'),
  (:course_id, '2026-04-13'),
  (:course_id, '2026-04-20'),
  ...;
```

※ ①〜③の結果をアプリケーション側で組み合わせて日付リストを作り、④で一括INSERTする。
日付の列挙（期間内の毎週月曜を取る）はPython側で行う方がシンプル。

#### カレンダー集約API のSQL例

`GET /api/calendar` で3種類のイベントを取得するとき：

```sql
-- 時間割（course_dates を courses と結合）
SELECT cd.date, c.id AS course_id, c.name, c.room, c.teacher, c.period
FROM course_dates cd
JOIN courses c ON c.id = cd.course_id
WHERE c.user_id = :user_id
  AND cd.date BETWEEN :start AND :end;

-- 個人イベント
SELECT id, title, date, start_time, end_time
FROM personal_events
WHERE user_id = :user_id
  AND date BETWEEN :start AND :end;

-- 大学イベント
SELECT id, name, date, type
FROM university_events
WHERE date BETWEEN :start AND :end;
```

---

## 5. API設計

### 5.1 共通ルール

| 項目 | 値 |
|---|---|
| 認証方式 | JWT（`Authorization: Bearer <token>` ヘッダー） |
| エラー形式 | `{ "detail": "エラーメッセージ" }` |
| 日付形式 | ISO 8601（`2026-04-01`） |
| 時刻形式 | `HH:MM`（`14:30`） |

### 5.2 認証

```
POST /api/auth/register    ユーザー登録（認証不要）
  req: { student_id, password }
  res: 201 { id, student_id }
  err: 409 学籍番号重複

POST /api/auth/login       ログイン（認証不要）
  req: { student_id, password }
  res: 200 { access_token, token_type: "bearer" }
  err: 401 認証失敗

POST /api/auth/logout      ログアウト（要認証）
  res: 204

GET  /api/auth/me          現在のユーザー情報（要認証）
  res: 200 { id, student_id }
```

### 5.3 時間割（courses）

```
GET    /api/courses              自分の時間割一覧
  res: 200 [{ id, name, room, teacher, day_of_week, period, quarter_id }]

POST   /api/courses              追加（course_dates も自動生成）
  req: { name, room, teacher, day_of_week, period, quarter_id }
  res: 201 { id, ... }

PUT    /api/courses/{id}         編集（必要に応じ course_dates を再生成）
  req: { name, room, teacher, day_of_week, period, quarter_id }
  res: 200 { id, ... }

DELETE /api/courses/{id}         削除（course_dates もカスケード削除）
  res: 204
```

### 5.4 個人イベント（personal_events）

```
GET    /api/personal-events                     一覧（期間指定も可）
  query: ?start=2026-04-01&end=2026-04-30
  res:   200 [{ id, title, date, start_time, end_time, description }]

POST   /api/personal-events                     追加
  req: { title, date, start_time, end_time, description }
  res: 201 { id, ... }

GET    /api/personal-events/{id}                詳細
  res: 200 { id, ... }

PUT    /api/personal-events/{id}                編集
  req: { title, date, start_time, end_time, description }
  res: 200 { id, ... }

DELETE /api/personal-events/{id}                削除
  res: 204
```

### 5.5 カレンダー表示（集約エンドポイント）

```
GET /api/calendar                カレンダー表示用
  query: ?start=2026-04-01&end=2026-04-30
  res: 200 {
    courses: [
      { course_id, name, room, teacher, date, period }
    ],
    personal_events: [
      { id, title, date, start_time, end_time }
    ],
    university_events: [
      { id, name, date, type }
    ]
  }
```

フロントはこの1本を叩くだけで表示用データが揃う。休日による除外・振替日の追加はバックエンド側で処理済み。

### 5.6 マスタデータ（読み取り専用）

```
GET /api/quarters                クォータ一覧
  res: 200 [{ id, name, start_date, end_date }]

GET /api/university-events       大学独自イベント一覧
  query: ?start=...&end=...
  res: 200 [{ id, name, date, type }]
```

---

## 6. 今後の実装順序（案）

1. PostgreSQL接続の準備（Renderでデータベース作成、FastAPIから接続）
2. マイグレーション・シードデータ投入（`university_events`, `quarters`）
3. 認証機能（register / login / logout / me）
4. 時間割機能（CRUD + course_dates 自動生成）
5. 個人イベント機能（CRUD）
6. カレンダー集約エンドポイント
7. フロントエンド実装
