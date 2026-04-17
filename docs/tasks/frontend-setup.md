# Frontend 共通準備タスク

先行タスク。これが終わらないと FE-α / FE-β / FE-γ 系が実装に入れない。

- [FE-0 React Router 導入 + レイアウト骨組み](#fe-0-react-router-導入--レイアウト骨組み)
- [FE-0.5 API通信の共通化（fetchラッパー）](#fe-05-api通信の共通化fetchラッパー)

← [TASKS.md に戻る](../TASKS.md)

---

## FE-0 React Router 導入 + レイアウト骨組み

**担当**: Frontend 1人（先行）

### 目的

アプリ全体で **複数ページ** を切り替えられるようにする。

- `/login`, `/register`, `/`（カレンダー）, `/courses`（時間割） の4ルート
- 全画面共通のヘッダー（カレンダー / 時間割 / ログアウト）
- 未ログイン時に保護ルートへアクセスしたら `/login` へリダイレクト（実装は [FE-α4](./frontend-auth.md#fe-α4-未ログイン時のガード保護ルート)）

現状は `main.tsx` の中に直接 `<FullCalendar />` が置かれているだけ。ここを **ルーティング構造** に作り変える。

### 受け入れ条件

- [ ] `react-router-dom` が `frontend/package.json` に追加されている
- [ ] `src/App.tsx` / `src/pages/` / `src/components/Layout.tsx`（または同等）が存在する
- [ ] 以下4ルートが動作する
  - `/login` → ログインプレースホルダー画面
  - `/register` → ユーザー登録プレースホルダー画面
  - `/` → カレンダー画面（現状の `<FullCalendar />` をここに移す）
  - `/courses` → 時間割プレースホルダー画面
- [ ] `/` と `/courses` の上部にヘッダー（「カレンダー」「時間割」「ログアウト」）が表示される
- [ ] ブラウザの戻る / 進むボタンでルートが正しく切り替わる

### 仕様

#### 画面構成

```
┌─────────────────────────────────────┐
│ ヘッダー: [カレンダー] [時間割] [ログアウト] │  ← 保護ルートでのみ表示
├─────────────────────────────────────┤
│                                     │
│          <Outlet />                  │  ← 子ルートの中身
│                                     │
└─────────────────────────────────────┘
```

#### ルート定義

| path | コンポーネント | 備考 |
|---|---|---|
| `/login` | `LoginPage` | ヘッダーなし |
| `/register` | `RegisterPage` | ヘッダーなし |
| `/` | `CalendarPage` | ヘッダーあり |
| `/courses` | `CoursesPage` | ヘッダーあり |

FE-0 の段階では中身はプレースホルダーでよい（`<h1>ログイン</h1>` 程度）。本実装は FE-α / β / γ 系で行う。

### 実装手順

#### 1. 依存関係を追加

```bash
cd frontend
npm install react-router-dom
```

`package.json` の `dependencies` に `react-router-dom` が入る。

#### 2. ディレクトリ構成の目安

```
frontend/src/
├── main.tsx             # createRoot のみ。ルーティングは App.tsx に分離
├── App.tsx              # ルート定義
├── components/
│   └── Layout.tsx       # ヘッダー付きのレイアウト
└── pages/
    ├── LoginPage.tsx
    ├── RegisterPage.tsx
    ├── CalendarPage.tsx
    └── CoursesPage.tsx
```

#### 3. `main.tsx` を整理

現状の `main.tsx` には FullCalendar のコードが直書きされている。これを `CalendarPage.tsx` に移し、`main.tsx` は以下のようにシンプルにする：

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

#### 4. `App.tsx` にルートを定義

骨格：

```tsx
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
// 他ページも同様に import

export default function App() {
  return (
    <Routes>
      {/* ヘッダーなしのルート */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* ヘッダーありのルート（Layout でラップ） */}
      <Route element={<Layout />}>
        <Route path="/" element={<CalendarPage />} />
        <Route path="/courses" element={<CoursesPage />} />
      </Route>
    </Routes>
  );
}
```

#### 5. `Layout.tsx` を作成

`<Outlet />` が子ルートの中身に差し替わる：

```tsx
import { Link, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <>
      <header>
        <nav>
          <Link to="/">カレンダー</Link>
          <Link to="/courses">時間割</Link>
          {/* ログアウトボタンは FE-α3 で実装 */}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
```

#### 6. 各ページのプレースホルダーを作成

例：

```tsx
// pages/LoginPage.tsx
export default function LoginPage() {
  return <h1>ログイン</h1>;
}
```

`CalendarPage.tsx` には、現状 `main.tsx` に書かれている `<FullCalendar />` 一式をそのまま移す。

#### 7. 動作確認

```bash
bash scripts/dev/start-frontend.sh
```

- http://localhost:5173/ → カレンダー（ヘッダー表示）
- http://localhost:5173/courses → 時間割プレースホルダー（ヘッダー表示）
- http://localhost:5173/login → ログインプレースホルダー（ヘッダーなし）
- ヘッダーの「時間割」「カレンダー」リンクで遷移できる

### 考え方のヒント

- **`<Link>` は `<a>` と違い、ページ全体のリロードを起こさない**。SPA としてなめらかに動く。普通の `<a href>` を使うと状態が全部リセットされる
- **レイアウトの共有は「入れ子ルート + `<Outlet />`」で表現する**。Layout コンポーネントを各ページで import するより DRY
- **`BrowserRouter` は一番外側に1つだけ**。`main.tsx` で包むのが定石
- `/login` と `/register` はヘッダーを出さない（ログイン前なのに「ログアウト」があるのは変）

### 参考

- [React Router v6 公式](https://reactrouter.com/en/main)
- 現状の `main.tsx`: [frontend/src/main.tsx](../../frontend/src/main.tsx)

---

## FE-0.5 API通信の共通化（fetchラッパー）

**担当**: Frontend 1人（先行、FE-0 と並行可）

### 目的

各画面が `fetch` を直接書かずに済むよう、共通ラッパー関数を作る。以下を一箇所にまとめることで画面側の実装を短くする：

- ベースURL（`/api`）の付与
- `Content-Type: application/json` の付与
- `Authorization: Bearer <token>` の自動付与（ログイン後）
- エラー時の統一ハンドリング（`{ detail: "..." }` を Error にする）
- レスポンスの JSON パース

後続の FE-α / FE-β / FE-γ 系の **全ての画面** がこのラッパーを使う。

### 受け入れ条件

- [ ] `src/lib/api.ts` に `api` オブジェクト（または関数群）が定義されている
- [ ] `api.get(path)`, `api.post(path, body)`, `api.put(path, body)`, `api.delete(path)` が使える
- [ ] `localStorage.getItem("access_token")` がセットされていれば `Authorization` ヘッダーが自動で付く
- [ ] エラーレスポンス（4xx/5xx）で例外が投げられ、メッセージに `detail` の内容が入っている
- [ ] 成功レスポンスは型パラメータ `<T>` で指定した型になる

### 仕様

#### 使い方の目安

```tsx
import { api } from "../lib/api";
import type { CalendarResponse } from "../types/api";

// GET
const data = await api.get<CalendarResponse>("/calendar?start=...&end=...");

// POST
const user = await api.post<{ id: number; student_id: string }>(
  "/auth/register",
  { student_id: "1234567890", password: "hoge1234" }
);

// DELETE（本文なし）
await api.delete("/courses/1");
```

#### エラー時の挙動

バックエンドが返すエラーは [DESIGN.md 5.1](../DESIGN.md#51-共通ルール) の通り：

```json
{ "detail": "invalid credentials" }
```

ラッパーはこれを拾って `Error("invalid credentials")` を throw する。呼び出し側は `try/catch` か `.catch()` で受ける。

### 実装手順

#### 1. `src/lib/api.ts` を新規作成

骨格：

```ts
const BASE_URL = "/api";

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // ログイン後は token を自動付与
  const token = localStorage.getItem("access_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // エラーレスポンスは { detail: "..." } を想定
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }

  // 204 No Content は body なし
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string)                  => request<T>("GET",    path),
  post:   <T>(path: string, body?: unknown)  => request<T>("POST",   path, body),
  put:    <T>(path: string, body?: unknown)  => request<T>("PUT",    path, body),
  delete: <T = void>(path: string)           => request<T>("DELETE", path),
};
```

#### 2. 既存の `main.tsx` を書き換えて動作確認

現状の `main.tsx`（または FE-0 で作った `CalendarPage.tsx`）の `fetch(...)` を `api.get(...)` に置き換える：

before:
```ts
fetch("/api/calendar?start=2026-04-01&end=2026-04-30")
  .then((res) => res.json())
  .then((data: CalendarResponse) => { ... });
```

after:
```ts
api.get<CalendarResponse>("/calendar?start=2026-04-01&end=2026-04-30")
  .then((data) => { ... });
```

ブラウザで開いて `Network` タブで `/api/calendar...` が 200 で返ることを確認。

#### 3. エラーケースも試す

開発者ツールのコンソールで：

```js
localStorage.setItem("access_token", "invalid-token");
```

↑ セットした状態でリロードし、認証必須 API を叩いたら（BE-A4 実装後）`Error: invalid token` が投げられることを確認。

### 考え方のヒント

- **BASE_URL を `/api` に固定**。Vite の proxy 設定（[vite.config.ts](../../frontend/vite.config.ts)）が `/api` を `localhost:8000` に流してくれる。本番では同じホストで配信されるので proxy なしでも動く
- **`localStorage` を毎リクエストで読む**のは、ログイン直後のリクエストにも反映させるため。React state に持つとタイミングで漏れる
- **token 管理の責務分離**: 「保存 / 削除 / 購読」は FE-α3 の `AuthContext` が担当。`api.ts` は **読むだけ**
- **body なしの POST**（logout など）に備えて `body?` を optional に
- `res.json()` は body が空だと例外になる。**204 を先に分岐する** のが安全
- 将来、「401 を拾ったら自動でログアウト」のような横断処理を足したくなったら、この `request()` に一行足すだけで全画面に反映される

### 参考

- [MDN: Fetch API](https://developer.mozilla.org/ja/docs/Web/API/Fetch_API)
- [DESIGN.md 5.1 共通ルール](../DESIGN.md#51-共通ルール) — エラー形式 / 認証方式
