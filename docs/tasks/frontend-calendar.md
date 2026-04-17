# Frontend カレンダー系タスク（担当β）

FE-0 / FE-0.5 完了後に着手。BE-B4（`GET /api/calendar`）が必要。

- [FE-β1 カレンダー画面の本実装](#fe-β1-カレンダー画面の本実装)
- [FE-β2 大学イベントの表示](#fe-β2-大学イベントの表示)
- [FE-β3 カレンダーからのイベント登録モーダル起動](#fe-β3-カレンダーからのイベント登録モーダル起動)

← [TASKS.md に戻る](../TASKS.md)

---

## FE-β1 カレンダー画面の本実装

**担当**: Frontend 担当β

### 目的

現状の「ハードコードされた `start/end` で1回だけ fetch する」実装を、**表示月（または週）が変わるたびに再fetchする** 本実装に差し替える。3種類のイベント（時間割 / 個人 / 大学）を色分けして表示する。

### 受け入れ条件

- [ ] `/` （カレンダー画面）で月 / 週 / 日の切り替えができる（デフォルトは週表示）
- [ ] 表示月を前後に移動すると、その範囲の `GET /api/calendar` が再度呼ばれる
- [ ] 時間割は **青**、個人イベントは **緑**、大学イベント（休日など）は **[FE-β2](#fe-β2-大学イベントの表示)** で実装
- [ ] イベントが重複する日時でも時系列に並んで表示される
- [ ] ローディング中 / エラー時の最低限の表示がある

### 仕様

#### API

```
GET /api/calendar?start=2026-04-01&end=2026-04-30
Authorization: Bearer <token>

→ {
  "courses":          [ { course_id, name, room, teacher, date, period }, ... ],
  "personal_events":  [ { id, title, date, start_time, end_time }, ... ],
  "university_events":[ { id, name, date, type }, ... ]
}
```

[DESIGN.md 5.5](../DESIGN.md#55-カレンダー表示集約エンドポイント) / [types/api.ts](../../frontend/src/types/api.ts) 参照。

#### 色分け（[DESIGN.md 2.5](../DESIGN.md#25-カレンダーでの表示ルール)）

| 種類 | 色 | 表示方法 |
|---|---|---|
| 時間割 | `#3788d8`（青） | `period` を時刻に変換してブロック表示 |
| 個人イベント | `#2ecc71`（緑） | `start_time`〜`end_time` のブロック表示 |
| 大学イベント | → [FE-β2](#fe-β2-大学イベントの表示) で実装 | |

時限↔時刻の対応は [constants.ts](../../frontend/src/constants.ts) の `periodToTime` に既に定義済み。

### 実装手順

#### 1. 日付範囲を state に持つ

FullCalendar の `datesSet` コールバックが「表示範囲が変わるたび」に呼ばれる。これを使って `start/end` を state に保存し、範囲変更時に再 fetch させる。

```tsx
import { useState, useEffect } from "react";
import type { DatesSetArg } from "@fullcalendar/core";

const [range, setRange] = useState<{ start: string; end: string } | null>(null);

function handleDatesSet(arg: DatesSetArg) {
  setRange({
    start: arg.startStr.slice(0, 10), // "2026-04-01T00:00:00+09:00" → "2026-04-01"
    end:   arg.endStr.slice(0, 10),
  });
}
```

#### 2. range が変わったら再 fetch

```tsx
const [events, setEvents] = useState<EventInput[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  if (!range) return;
  setLoading(true);
  setError(null);
  api.get<CalendarResponse>(`/calendar?start=${range.start}&end=${range.end}`)
    .then((data) => {
      setEvents(buildEvents(data));  // ↓ 次のステップ
    })
    .catch((e) => setError(e.message))
    .finally(() => setLoading(false));
}, [range]);
```

#### 3. API レスポンス → FullCalendar の EventInput[] に変換

現状の `main.tsx` の変換処理を関数として抽出：

```tsx
import type { EventInput } from "@fullcalendar/core";
import { periodToTime } from "../constants";
import type { CalendarResponse } from "../types/api";

function buildEvents(data: CalendarResponse): EventInput[] {
  const courseEvents: EventInput[] = data.courses.map((c) => ({
    title: c.name,
    start: `${c.date}T${periodToTime[c.period]!.start}`,
    end:   `${c.date}T${periodToTime[c.period]!.end}`,
    color: "#3788d8",
    extendedProps: { kind: "course", courseId: c.course_id },
  }));

  const personalEvents: EventInput[] = data.personal_events.map((p) => ({
    title: p.title,
    start: `${p.date}T${p.start_time}`,
    end:   `${p.date}T${p.end_time}`,
    color: "#2ecc71",
    extendedProps: { kind: "personal", id: p.id },
  }));

  // university_events は FE-β2 で追加
  return [...courseEvents, ...personalEvents];
}
```

#### 4. FullCalendar に渡す

```tsx
<FullCalendar
  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
  initialView="timeGridWeek"
  headerToolbar={{
    left: "prev,next today",
    center: "title",
    right: "dayGridMonth,timeGridWeek,timeGridDay",
  }}
  locale="ja"
  events={events}
  datesSet={handleDatesSet}
/>
```

#### 5. ローディング / エラー表示

最低限でOK：

```tsx
{loading && <p>読み込み中...</p>}
{error && <p style={{ color: "red" }}>{error}</p>}
<FullCalendar ... />
```

#### 6. 動作確認

- BE-B4 が完成済みの状態でログイン → `/` を開く
- 月を前後に動かすたびに Network タブで `/api/calendar?start=...&end=...` が再度叩かれている
- 時間割（青）と個人イベント（緑）が表示される

### 考え方のヒント

- **`datesSet` は「表示範囲が変わった瞬間」に呼ばれる**。初回マウント時にも呼ばれるので、初期 fetch もこれに任せられる
- `startStr` / `endStr` は ISO 8601 のタイムゾーン付き文字列。`slice(0, 10)` で日付部分だけ取り出せる
- **FullCalendar の `end` は "排他的"**（その日を含まない）。API 側も同じ仕様なら OK、違うならフロントで1日引く / 足す調整が必要
- `extendedProps` に `kind` と id を入れておくと、FE-β3 で「クリックされたイベントの種類」を判別するのに使える
- Pure な変換関数 `buildEvents` に切り出しておくと、後で大学イベントを足すのがラク

---

## FE-β2 大学イベントの表示

**担当**: Frontend 担当β

### 目的

`university_events` を「普通のイベント」として出すのではなく、**日全体** や **ヘッダー** に視覚的に反映する。

### 受け入れ条件

- [ ] `holiday` の日は **背景がグレー**
- [ ] `exam` の期間は **オレンジのバナー** が出る（または該当日がオレンジ背景）
- [ ] `transfer` の日は日付ヘッダーに **「月曜授業」** など振替元曜日の表示が出る（赤色）
- [ ] `other`（学園祭など）の日は **ヘッダーに name** が出る

### 仕様

#### FullCalendar での実現手段

| 種類 | 手段 |
|---|---|
| 背景色変更（holiday, exam） | `events` に `display: 'background'` を付けて渡す |
| 日付ヘッダーへの追加表示 | `dayCellContent` または `dayHeaderContent` コールバック |

背景イベントは「見た目だけ」。クリック不可でカレンダーの塗りつぶしになる。

### 実装手順

#### 1. `buildEvents` に大学イベントを追加

[FE-β1](#fe-β1-カレンダー画面の本実装) で作った関数に追加：

```tsx
function buildEvents(data: CalendarResponse): EventInput[] {
  const courseEvents = /* ... */;
  const personalEvents = /* ... */;

  const universityBgEvents: EventInput[] = data.university_events
    .filter((u) => u.type === "holiday" || u.type === "exam")
    .map((u) => ({
      start: u.date,
      end:   u.date,   // 1日分（FullCalendar の仕様上は終日の扱い）
      allDay: true,
      display: "background",
      color: u.type === "holiday" ? "#e0e0e0" : "#ffcc80",  // グレー / オレンジ
      extendedProps: { kind: "university", universityType: u.type, name: u.name },
    }));

  return [...courseEvents, ...personalEvents, ...universityBgEvents];
}
```

#### 2. 振替日 / その他イベントを日付ヘッダーに

`dayCellContent` コールバックで、その日の `university_event` を探して表示する：

```tsx
import type { DayCellContentArg } from "@fullcalendar/core";

// コンポーネントの中（university_events を state に別管理しておく）
const [uniEvents, setUniEvents] = useState<CalendarUniversityEvent[]>([]);

// ↓ api fetch 後
setUniEvents(data.university_events);

// ↓ FullCalendar に渡す
function renderDayCell(arg: DayCellContentArg) {
  const iso = arg.date.toISOString().slice(0, 10);
  const ev = uniEvents.find((u) => u.date === iso);
  return (
    <>
      <div>{arg.dayNumberText}</div>
      {ev?.type === "transfer" && (
        <span style={{ color: "red" }}>
          {ev.name /* 例: 「月曜授業」 */}
        </span>
      )}
      {ev?.type === "other" && <span>{ev.name}</span>}
    </>
  );
}

<FullCalendar
  /* ... */
  dayCellContent={renderDayCell}
/>
```

#### 3. 動作確認

- シードデータで `holiday`（例: 5/4）を仕込んだ日 → 背景がグレー
- `exam`（例: 5/29）の日 → 背景がオレンジ
- `transfer`（例: 4/2 = 月曜振替）→ その日のヘッダーに赤字で名前が出る
- `other`（例: 11/6 学園祭）→ その日のヘッダーに名前が出る

### 考え方のヒント

- **`display: 'background'` は FullCalendar の便利機能**。普通のイベントのように塗りつぶすのではなく、その日の「背景レイヤー」になる
- 連続する exam 期間を1つのバナーで出したければ、start / end を期間指定 + display:"background" で表現できる（例: `start: "2026-05-27", end: "2026-05-31"`）。end は **排他的**
- `dayCellContent` は **月表示 / 週表示で呼び出し頻度が高い**。重い処理を書くと描画がカクつく。`useCallback` + Map で O(1) lookup にしておくと安全
- 色は [DESIGN.md 2.5](../DESIGN.md#25-カレンダーでの表示ルール) に準拠する。ピッタリの色でなくてもOK、後で調整する
- 振替日の「月曜授業」表記は `university_events.name` に元から入れておくと `original_day` を見て整形しなくて済む（シードデータの設計次第）

### 参考

- [FullCalendar Background Events](https://fullcalendar.io/docs/background-events)
- [FullCalendar dayCellContent](https://fullcalendar.io/docs/day-cell-render-hooks)

---

## FE-β3 カレンダーからのイベント登録モーダル起動

**担当**: Frontend 担当β（[FE-γ2, γ3](./frontend-course.md) と連携）

### 目的

カレンダー画面から **個人イベントの追加 / 編集** を行えるようにする。モーダル本体は FE-γ2 / γ3 で作られるので、ここでは **モーダルを開くトリガー** を用意する。

### 受け入れ条件

- [ ] 空白の日付をクリック → **個人イベント登録モーダル**（FE-γ2）が開き、その日付がデフォルト値で入っている
- [ ] 既存の個人イベント（緑）をクリック → **個人イベント詳細/編集モーダル**（FE-γ3）が開く
- [ ] 時間割（青）や大学イベントをクリックしても **モーダルは開かない**（無反応でOK）
- [ ] モーダルでの登録 / 編集後にカレンダーが再 fetch されて最新状態になる

### 仕様

FullCalendar のコールバック：

| コールバック | 発火タイミング |
|---|---|
| `dateClick` | 何もない日付/時間帯をクリック |
| `eventClick` | 既存のイベントをクリック |

### 実装手順

#### 1. モーダルの open / close を state で持つ

```tsx
const [createOpen, setCreateOpen] = useState<{ date: string } | null>(null);
const [editOpen, setEditOpen] = useState<{ id: number } | null>(null);
```

`null` = 閉じている、オブジェクト = 開いている + その状態。

#### 2. FullCalendar にコールバックを渡す

```tsx
import type { DateClickArg } from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";

function handleDateClick(arg: DateClickArg) {
  // "2026-04-15" 形式
  setCreateOpen({ date: arg.dateStr });
}

function handleEventClick(arg: EventClickArg) {
  const kind = arg.event.extendedProps.kind;
  if (kind !== "personal") return;  // 時間割・大学イベントは無反応
  const id = arg.event.extendedProps.id as number;
  setEditOpen({ id });
}

<FullCalendar
  /* ... */
  dateClick={handleDateClick}
  eventClick={handleEventClick}
/>
```

#### 3. モーダルをレンダリング

```tsx
{createOpen && (
  <PersonalEventCreateModal
    defaultDate={createOpen.date}
    onClose={() => setCreateOpen(null)}
    onCreated={() => {
      setCreateOpen(null);
      refetch();  // カレンダー再読込
    }}
  />
)}

{editOpen && (
  <PersonalEventEditModal
    eventId={editOpen.id}
    onClose={() => setEditOpen(null)}
    onUpdated={() => {
      setEditOpen(null);
      refetch();
    }}
    onDeleted={() => {
      setEditOpen(null);
      refetch();
    }}
  />
)}
```

`PersonalEventCreateModal` / `PersonalEventEditModal` は **FE-γ2 / γ3 が作るコンポーネント**。ここでは props のインターフェースだけ決めて呼び出す。

#### 4. `refetch` の実装

FE-β1 の `useEffect([range])` と同じ処理を関数として抽出：

```tsx
const refetch = useCallback(() => {
  if (!range) return;
  setLoading(true);
  api.get<CalendarResponse>(`/calendar?start=${range.start}&end=${range.end}`)
    .then((data) => setEvents(buildEvents(data)))
    .catch((e) => setError(e.message))
    .finally(() => setLoading(false));
}, [range]);

useEffect(() => { refetch(); }, [refetch]);
```

#### 5. 動作確認

- 空白の日付をクリック → 登録モーダルが開く（仮実装でOK）
- 緑のイベントをクリック → 編集モーダルが開く
- 青の時間割をクリック → 何も起きない
- モーダルで保存 → 閉じてカレンダーが更新される

### 考え方のヒント

- **FE-γ2 / γ3 と並行で進めるために、モーダルの props インターフェースを先に決める**。ここに書いた `defaultDate`, `eventId`, `onClose`, `onCreated`, `onUpdated`, `onDeleted` を合意事項として共有する
- `eventClick` の `arg.event.extendedProps` に FE-β1 で入れた `kind` が入っている。これで種類判別
- **`dateClick` は月表示ではクリックした日付、週表示ではクリックした時刻枠** で発火する。週表示なら `arg.dateStr` は `"2026-04-15T14:30:00"` 形式になることがある。`.slice(0, 10)` で日付だけ取り出すと両対応しやすい
- カレンダーの再 fetch は state 更新で十分。リアクティブに再計算されるので race condition は起きにくい
- 先に時間割（青）の編集画面を [FE-γ1](./frontend-course.md#fe-γ1-時間割画面-courses) に寄せているので、カレンダー画面ではクリック不可の方針にする（シンプルさを優先）

### 参考

- [FullCalendar dateClick](https://fullcalendar.io/docs/dateClick)
- [FullCalendar eventClick](https://fullcalendar.io/docs/eventClick)
