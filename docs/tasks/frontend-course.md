# Frontend 時間割・個人イベント系タスク（担当γ）

FE-0 / FE-0.5 完了後に着手。BE-B1（courses）/ BE-B3（personal-events）/ BE-B5（quarters）と繋ぎ込む。

- [FE-γ1 時間割画面 `/courses`](#fe-γ1-時間割画面-courses)
- [FE-γ2 個人イベント登録モーダル](#fe-γ2-個人イベント登録モーダル)
- [FE-γ3 個人イベント詳細・編集モーダル](#fe-γ3-個人イベント詳細編集モーダル)
- [FE-γ4 時間割未登録時の案内表示](#fe-γ4-時間割未登録時の案内表示)

← [TASKS.md に戻る](../TASKS.md)

---

## FE-γ1 時間割画面 `/courses`

**担当**: Frontend 担当γ

### 目的

時間割を **表形式（曜日×時限）** で一覧表示し、授業の追加 / 編集 / 削除を行えるようにする。

### 受け入れ条件

- [ ] `/courses` で 7曜日 × 6時限 のグリッドが表示される
- [ ] 各セルに該当する授業の `name` / `room` / `teacher` が表示される
- [ ] 空のセルをクリック → 授業追加モーダルが開く（曜日・時限・クォータ選択済み）
- [ ] 既存の授業セルをクリック → 編集モーダルが開く（name / room / teacher / quarter 変更可）
- [ ] 編集モーダルから削除できる
- [ ] 追加 / 編集 / 削除後に一覧が更新される
- [ ] クォータ切り替えUI（Q1〜Q4 のタブ or セレクト）があり、選択したクォータの授業だけ表示される

### 仕様

#### 画面イメージ

```
┌─────┬────┬────┬────┬────┬────┬────┬────┐
│     │ 月 │ 火 │ 水 │ 木 │ 金 │ 土 │ 日 │
├─────┼────┼────┼────┼────┼────┼────┼────┤
│ 1限 │ 数学│    │ 物理│    │    │    │    │
├─────┼────┼────┼────┼────┼────┼────┼────┤
│ 2限 │    │英語 │    │    │    │    │    │
├─────┼────┼────┼────┼────┼────┼────┼────┤
│ ...  │                                  │
```

セル = `{ day_of_week, period }` の組で一意。

#### API

```
GET    /api/courses                自分の courses
POST   /api/courses                追加
PUT    /api/courses/{id}           編集
DELETE /api/courses/{id}           削除
GET    /api/quarters               クォータ選択用
```

詳細は [BE-B1](./backend-data.md#be-b1-getpostputdelete-apicourses) / [DESIGN.md 5.3](../DESIGN.md#53-時間割courses) 参照。

### 実装手順

#### 1. クォータ一覧と courses を取得

```tsx
const [quarters, setQuarters] = useState<Quarter[]>([]);
const [selectedQuarterId, setSelectedQuarterId] = useState<number | null>(null);
const [courses, setCourses] = useState<Course[]>([]);

useEffect(() => {
  api.get<Quarter[]>("/quarters").then((qs) => {
    setQuarters(qs);
    if (qs.length > 0) setSelectedQuarterId(qs[0].id);  // 最初の Q を初期選択
  });
}, []);

useEffect(() => {
  api.get<Course[]>("/courses").then(setCourses);
}, []);

const filtered = courses.filter((c) => c.quarter_id === selectedQuarterId);
```

型（[DESIGN.md 3.1](../DESIGN.md#31-テーブル一覧)参照）：

```ts
type Quarter = {
  id: number;
  term: string;      // "Q1" 等
  year: string;
  start_date: string;
  end_date: string;
};

type Course = {
  id: number;
  user_id: number;
  quarter_id: number;
  name: string;
  room: string;
  teacher: string;
  day_of_week: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  period: number;   // 1..6
};
```

既存型が `types/api.ts` にある場合はそちらを再利用。ない場合は同ファイルに追加すること。

#### 2. グリッドを描画

`(day_of_week, period)` で探すヘルパーを用意：

```tsx
const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const periods = [1, 2, 3, 4, 5, 6] as const;

function findCourse(day: string, period: number): Course | undefined {
  return filtered.find((c) => c.day_of_week === day && c.period === period);
}
```

テーブル描画：

```tsx
<table>
  <thead>
    <tr>
      <th></th>
      {days.map((d) => <th key={d}>{dayLabel(d)}</th>)}
    </tr>
  </thead>
  <tbody>
    {periods.map((p) => (
      <tr key={p}>
        <th>{p}限</th>
        {days.map((d) => {
          const course = findCourse(d, p);
          return (
            <td key={d} onClick={() => handleCellClick(d, p, course)}>
              {course ? (
                <>
                  <div>{course.name}</div>
                  <div>{course.room} / {course.teacher}</div>
                </>
              ) : null}
            </td>
          );
        })}
      </tr>
    ))}
  </tbody>
</table>
```

#### 3. 追加 / 編集モーダルを作る

`CourseModal` コンポーネント（1つで追加も編集も兼ねる方針）：

```tsx
type CourseModalProps = {
  mode: "create" | "edit";
  initial: Partial<Course>;   // 既存編集のときは全フィールド / 追加のときは day/period/quarter だけ
  quarters: Quarter[];
  onClose: () => void;
  onSaved: () => void;
};
```

フォーム項目：`name` / `room` / `teacher` / `quarter_id`（select）/ `day_of_week` / `period`（追加時は readonly）。

送信：

```tsx
async function handleSubmit() {
  const body = { name, room, teacher, day_of_week, period, quarter_id };
  if (mode === "create") {
    await api.post("/courses", body);
  } else {
    await api.put(`/courses/${initial.id}`, body);
  }
  onSaved();
}
```

削除ボタン（edit モード時のみ）：

```tsx
async function handleDelete() {
  if (!confirm("削除しますか？")) return;
  await api.delete(`/courses/${initial.id}`);
  onSaved();
}
```

#### 4. セルクリックでモーダルを開く

```tsx
const [modal, setModal] = useState<
  | { mode: "create"; initial: Partial<Course> }
  | { mode: "edit"; initial: Course }
  | null
>(null);

function handleCellClick(day: string, period: number, course?: Course) {
  if (course) {
    setModal({ mode: "edit", initial: course });
  } else {
    setModal({
      mode: "create",
      initial: { day_of_week: day as Course["day_of_week"], period, quarter_id: selectedQuarterId! },
    });
  }
}

{modal && (
  <CourseModal
    {...modal}
    quarters={quarters}
    onClose={() => setModal(null)}
    onSaved={() => {
      setModal(null);
      api.get<Course[]>("/courses").then(setCourses);  // 再取得
    }}
  />
)}
```

#### 5. 動作確認

- `/courses` を開く → クォータ切り替えが動く
- 空セルクリック → モーダル開く → 保存 → グリッドに反映
- 既存セルクリック → 内容が埋まったモーダル → 編集 → 反映
- 削除ボタン → セルが空に
- `/` カレンダー画面に戻って、該当日に青のブロックが出ていることを確認（BE-B2 の `course_dates` 自動生成が動いていれば）

### 考え方のヒント

- **1つのモーダルで add / edit を兼ねる** とコード量が減る。`mode` と `initial` だけ渡せばいい
- **`filter` でクォータを絞るのはクライアント側で OK**。courses 全件をローカルに持って切り替えるだけ。API に quarter_id をクエリで投げる方式でも可（サーバーが対応していれば）
- **`day_of_week` は enum**（`"mon" | "tue" | ...`）で型を付けておく。タイプミスをコンパイル時に防げる
- グリッドのセルはクリック可能に見えるように `cursor: pointer` などのスタイルを付けると UX が良い
- 同じ `(day, period, quarter)` に複数授業を登録できるか？は仕様次第。今回は1つだけ前提でOK（UIがシンプルになる）。DB 側で制約するかは FE では考えない

### 参考

- [BE-B1 courses CRUD](./backend-data.md#be-b1-getpostputdelete-apicourses)
- [BE-B5 quarters 読み取り](./backend-data.md#be-b5-get-apiquarters-get-apiuniversity-events)

---

## FE-γ2 個人イベント登録モーダル

**担当**: Frontend 担当γ

### 目的

`POST /api/personal-events` を叩いて個人イベントを追加するモーダルを作る。**FE-β3 から呼び出される**。

### 受け入れ条件

- [ ] モーダルに `title` / `date` / `start_time` / `end_time` / `description` の入力欄がある
- [ ] `defaultDate` props で初期日付がセットされている（カレンダークリック時の日付）
- [ ] 送信成功で `onCreated()` コールバックが呼ばれ、モーダルが閉じる
- [ ] 必須項目（title / date / start_time / end_time）が空だとバリデーションで止まる
- [ ] エラー時にメッセージが表示される

### 仕様

#### props インターフェース（FE-β3 と合意事項）

```ts
type PersonalEventCreateModalProps = {
  defaultDate: string;     // "2026-04-15"
  onClose: () => void;
  onCreated: () => void;
};
```

#### API

```
POST /api/personal-events
{ title, date, start_time, end_time, description? }
→ 201 { id, ... }
```

[DESIGN.md 5.4](../DESIGN.md#54-個人イベントpersonal_events) 参照。

### 実装手順

#### 1. `components/PersonalEventCreateModal.tsx` を作成

骨格：

```tsx
import { useState } from "react";
import { api } from "../lib/api";

export default function PersonalEventCreateModal(props: PersonalEventCreateModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(props.defaultDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/personal-events", {
        title,
        date,
        start_time: startTime,
        end_time: endTime,
        description: description || null,
      });
      props.onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録失敗");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={props.onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          {/* 入力欄と閉じるボタン */}
        </form>
      </div>
    </div>
  );
}
```

#### 2. 入力欄の型

- `title`: `<input type="text" required />`
- `date`: `<input type="date" required />`（YYYY-MM-DD 形式で value / onChange）
- `start_time`, `end_time`: `<input type="time" required />`（HH:MM 形式）
- `description`: `<textarea />`

`type="date"` と `type="time"` はブラウザが標準でピッカーを出してくれる。

#### 3. モーダル背景クリックで閉じる

`onClick={props.onClose}` をオーバーレイに。内側の `onClick={(e) => e.stopPropagation()}` で「モーダル本体をクリックして閉じる」を防ぐ。

#### 4. 動作確認

- FE-β3 の起動経路から開く → `defaultDate` が入っている
- 保存 → モーダルが閉じる → カレンダーに新しい緑のブロックが表示される
- 必須欄を空にして送信 → HTML5 バリデーションが効いてAPI が呼ばれない
- 終了時刻を開始時刻より前にすると... → 特に制約なし（バックエンドの仕様次第）

### 考え方のヒント

- **モーダルのスタイリング**: 最低限 `position: fixed; top: 0; ...; background: rgba(0,0,0,0.5)` で覆えばそれっぽくなる。凝りすぎない
- **`description` 空文字 vs null**: API が `null` 許可なので空文字なら `null` にして送ると DB に無駄な空文字が入らない
- **HTML5 の `required`** だけでバリデーションしてOK（初心者フェーズ）。Zod / react-hook-form はハッカソンでは過剰
- `type="date"` の value 形式は `"YYYY-MM-DD"`、`type="time"` は `"HH:MM"`。ちょうど API の仕様と一致するので変換不要
- モーダルのレンダリング場所は Portal（`createPortal`）を使うのが本格派だが、普通に `{modal && <Modal />}` で子要素として描いてもOK

---

## FE-γ3 個人イベント詳細・編集モーダル

**担当**: Frontend 担当γ

### 目的

既存の個人イベントを編集 / 削除するモーダル。**FE-β3 から呼び出される**。

### 受け入れ条件

- [ ] マウント時に `GET /api/personal-events/{id}` で詳細を取得して入力欄に入れる
- [ ] 編集 → `PUT /api/personal-events/{id}` で更新し `onUpdated()` を呼ぶ
- [ ] 削除ボタン → 確認ダイアログ → `DELETE /api/personal-events/{id}` で削除し `onDeleted()` を呼ぶ
- [ ] 取得中はスピナー or 「読み込み中」表示
- [ ] エラー時にメッセージ

### 仕様

#### props インターフェース

```ts
type PersonalEventEditModalProps = {
  eventId: number;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
};
```

#### API

```
GET    /api/personal-events/{id}   詳細
PUT    /api/personal-events/{id}   編集
DELETE /api/personal-events/{id}   削除
```

### 実装手順

#### 1. `components/PersonalEventEditModal.tsx` を作成

FE-γ2 とほぼ同じ構造。差分だけ示す：

```tsx
const [loading, setLoading] = useState(true);

useEffect(() => {
  api.get<PersonalEvent>(`/personal-events/${props.eventId}`)
    .then((e) => {
      setTitle(e.title);
      setDate(e.date);
      setStartTime(e.start_time);
      setEndTime(e.end_time);
      setDescription(e.description ?? "");
    })
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false));
}, [props.eventId]);

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setSubmitting(true);
  try {
    await api.put(`/personal-events/${props.eventId}`, {
      title, date,
      start_time: startTime, end_time: endTime,
      description: description || null,
    });
    props.onUpdated();
  } catch (err) {
    setError(err instanceof Error ? err.message : "更新失敗");
  } finally {
    setSubmitting(false);
  }
}

async function handleDelete() {
  if (!confirm("削除しますか？")) return;
  try {
    await api.delete(`/personal-events/${props.eventId}`);
    props.onDeleted();
  } catch (err) {
    setError(err instanceof Error ? err.message : "削除失敗");
  }
}
```

#### 2. レンダリング中の loading 分岐

```tsx
if (loading) return <div className="modal">読み込み中...</div>;
```

#### 3. 動作確認

- カレンダーの緑ブロックをクリック → モーダルに値が入っている
- 編集 → 保存 → カレンダーに反映
- 削除 → 確認 → OK → ブロックが消える

### 考え方のヒント

- **γ2 と γ3 は約80% 同じコード**。共通コンポーネント（`PersonalEventForm`）に抽出して、`submitHandler` だけ差し替える設計も可。ただし過剰な抽象化は避け、似たコードが並んでいるだけでも許容する方が読みやすいこともある
- **`confirm()` は最低限の確認ダイアログ**。ブラウザ標準で十分。カスタムモーダル内に `confirm()` が重なると UX が悪いので、モーダル内に「本当に削除？」ボタンを出して2段階にする設計もアリ
- `description ?? ""` は null を空文字に変換するイディオム（null 合体演算子）。input の value に null を渡すと React が警告を出す
- `useEffect` の依存配列に `props.eventId` を入れる。同じモーダルで別イベントを開かれたときに再取得される

---

## FE-γ4 時間割未登録時の案内表示

**担当**: Frontend 担当γ

### 目的

初回ログイン後、時間割がまだ登録されていない場合に **「時間割を登録しましょう」** の案内を表示する（[DESIGN.md 2.4](../DESIGN.md#24-初回ログイン後の動線)）。

### 受け入れ条件

- [ ] カレンダー画面 `/` の上部（またはカレンダーの代わり）に、courses が0件なら案内バナーが表示される
- [ ] 案内の中に「時間割を登録する」ボタン or リンクがあり、クリックで `/courses` に遷移する
- [ ] courses が1件以上あれば案内は非表示

### 仕様

#### 案内の見た目（例）

```
┌──────────────────────────────────────────┐
│ 📚 時間割がまだ登録されていません         │
│    [時間割を登録する →]                    │
└──────────────────────────────────────────┘
```

### 実装手順

#### 1. カレンダー画面で courses 件数を確認

`CalendarPage.tsx` 内で `/api/courses` を別途取得する（件数だけわかればOK）。

```tsx
const [hasCourses, setHasCourses] = useState<boolean | null>(null);

useEffect(() => {
  api.get<Course[]>("/courses")
    .then((cs) => setHasCourses(cs.length > 0))
    .catch(() => setHasCourses(true));  // エラー時は案内を出さない（誤爆防止）
}, []);
```

#### 2. 案内バナーを表示

```tsx
{hasCourses === false && (
  <div className="banner">
    <p>時間割がまだ登録されていません</p>
    <Link to="/courses">時間割を登録する →</Link>
  </div>
)}
<FullCalendar /* ... */ />
```

`hasCourses === false` にしているのは、`null`（取得前）のときに案内が一瞬ちらつくのを避けるため。

#### 3. 動作確認

- 新規登録したユーザーでログイン → カレンダー画面に案内が出る
- 時間割を1件登録 → カレンダー画面に戻る → 案内が消える

### 考え方のヒント

- **「0件」判定はサーバー依存にしない**。`GET /api/courses` のレスポンス長で判断するだけでOK
- `hasCourses === false` と `!hasCourses` の違いを意識する。後者だと `null` も含まれてフラッシュする
- **案内のスタイル**: 派手にしすぎず、でも見逃されない程度に。[DESIGN.md 2.5](../DESIGN.md#25-カレンダーでの表示ルール) の色使いに寄せても良い
- 案内の出現条件を「quarterが未選択 && coursesが0」のようにきめ細かくするのは過剰。シンプルに0件判定で十分
- 本来は [BE-B1](./backend-data.md#be-b1-getpostputdelete-apicourses) の `GET /api/courses` の結果を `CalendarPage` と共有したいが、別画面なので state を上げると複雑になる。小規模なので各画面で fetch してOK

### 参考

- [DESIGN.md 2.4 初回ログイン後の動線](../DESIGN.md#24-初回ログイン後の動線)
