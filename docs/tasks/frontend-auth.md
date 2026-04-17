# Frontend 認証系タスク（担当α）

FE-0 / FE-0.5 の後に着手。BE-A2, A3, A4 と繋ぎ込む。

- [FE-α1 ログイン画面 `/login`](#fe-α1-ログイン画面-login)
- [FE-α2 ユーザー登録画面 `/register`](#fe-α2-ユーザー登録画面-register)
- [FE-α3 認証状態管理（AuthContext）](#fe-α3-認証状態管理authcontext)
- [FE-α4 未ログイン時のガード（保護ルート）](#fe-α4-未ログイン時のガード保護ルート)

← [TASKS.md に戻る](../TASKS.md)

---

## FE-α1 ログイン画面 `/login`

**担当**: Frontend 担当α

### 目的

学籍番号＋パスワードのフォームを作り、`POST /api/auth/login` を叩いて JWT を取得。成功したら `/` へ遷移する。

### 受け入れ条件

- [ ] `/login` で学籍番号 / パスワードの入力欄と「ログイン」ボタンが表示される
- [ ] 正しい認証情報を入力するとカレンダー画面（`/`）に遷移する
- [ ] 受け取った `access_token` が `localStorage` に保存される
- [ ] 誤った認証情報だとエラーメッセージが画面に表示される（`detail` の中身）
- [ ] 送信中はボタンが disabled になる（連打防止）
- [ ] 「アカウント作成はこちら」のリンクで `/register` へ飛べる

### 仕様

#### フォーム

| 項目 | required | type |
|---|---|---|
| 学籍番号 | ✓ | text |
| パスワード | ✓ | password |

#### API 呼び出し

```
POST /api/auth/login
{ "student_id": "...", "password": "..." }
→ 200: { "access_token": "...", "token_type": "bearer" }
→ 401: { "detail": "invalid credentials" }
```

詳細は [BE-A3](./backend-auth.md#be-a3-post-apiauthlogin) / [DESIGN.md 5.2](../DESIGN.md#52-認証) を参照。

### 実装手順

#### 1. `pages/LoginPage.tsx` を実装

骨格：

```tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";

type LoginResponse = {
  access_token: string;
  token_type: string;
};

export default function LoginPage() {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await api.post<LoginResponse>("/auth/login", {
        student_id: studentId,
        password,
      });
      localStorage.setItem("access_token", data.access_token);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>ログイン</h1>
      {/* 入力欄 2つ、送信ボタン、error 表示、register へのリンク */}
    </form>
  );
}
```

#### 2. 入力欄を繋ぎ込む

`<input value={studentId} onChange={(e) => setStudentId(e.target.value)} />` のパターン。パスワードは `type="password"` を忘れない。

#### 3. エラー表示

`error` が null でないときだけ `<p>{error}</p>` を出す。

#### 4. 動作確認

- バックエンドを起動し、先に [BE-A2](./backend-auth.md#be-a2-post-apiauthregister) でテストユーザーを1人登録しておく（`/docs` からでOK）
- `/login` を開いて学籍番号 / パスワードを入力
- 成功 → `/` に遷移 / 失敗 → エラーメッセージが表示される
- 開発者ツールの Application → Local Storage に `access_token` が保存されているか確認

### 考え方のヒント

- **非同期処理中のボタン disabled は UX の基本**。送信中に2回目を投げられると重複登録や混乱の元になる
- `navigate("/")` は `react-router-dom` の `useNavigate` フック経由で取得する
- エラーメッセージは `err.message` から取る。[FE-0.5](./frontend-setup.md#fe-05-api通信の共通化fetchラッパー) の `api.ts` が `detail` を `Error` にして投げている
- **`localStorage` への保存は [FE-α3](#fe-α3-認証状態管理authcontext) で作る `AuthContext` に寄せるのが理想**。ただし α3 が未完の段階で α1 を進めるときは、一旦ここで直接 `setItem` してOK。α3 完成時にリファクタする
- パスワード強度チェックなどは今回の仕様外

---

## FE-α2 ユーザー登録画面 `/register`

**担当**: Frontend 担当α

### 目的

新規ユーザー登録フォームを作り、`POST /api/auth/register` を叩く。成功したらログイン画面へ遷移する（自動ログインは行わない）。

### 受け入れ条件

- [ ] `/register` で 学籍番号 / パスワード / パスワード（確認） の入力欄がある
- [ ] パスワードと確認用が一致しない場合、クライアント側でエラーを出してAPIを叩かない
- [ ] 登録成功 → `/login` に遷移し「登録しました。ログインしてください」などのメッセージ or そのまま
- [ ] 409（学籍番号重複）時にエラーメッセージが表示される
- [ ] 「ログインはこちら」のリンクで `/login` へ戻れる

### 仕様

```
POST /api/auth/register
{ "student_id": "...", "password": "..." }
→ 201: { "id": 1, "student_id": "..." }
→ 409: { "detail": "student_id already exists" }
```

### 実装手順

#### 1. `pages/RegisterPage.tsx` を実装

ロジックは FE-α1 とほぼ同じ。差分だけ示す：

```tsx
const [password2, setPassword2] = useState("");

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (password !== password2) {
    setError("パスワードが一致しません");
    return;
  }
  setError(null);
  setSubmitting(true);
  try {
    await api.post("/auth/register", {
      student_id: studentId,
      password,
    });
    // 登録後はそのままログイン画面へ
    navigate("/login");
  } catch (err) {
    setError(err instanceof Error ? err.message : "登録に失敗しました");
  } finally {
    setSubmitting(false);
  }
}
```

#### 2. 動作確認

- `/register` で新規作成 → `/login` に遷移 → 同じ学籍番号でログインできる
- 同じ学籍番号で再登録 → 409 のエラーメッセージが表示される
- パスワード不一致 → API を叩かずにエラー表示される（Network タブで確認）

### 考え方のヒント

- **クライアント側バリデーションはサーバー側の代替ではない**。サーバーは必ず最終チェックする前提だが、明らかに無駄なリクエストを減らすためにクライアント側でも簡単なチェックを入れる
- 登録後に **自動ログインしない** 方針を採っているのは、シンプルに保つため（トークン発行のフローが1本化する）
- 学籍番号のバリデーション（10桁など）は今回は入れない。サーバー側の判定に任せる

---

## FE-α3 認証状態管理（AuthContext）

**担当**: Frontend 担当α（**最重要**）

### 目的

アプリ全体から参照できる **認証状態** を持ち、ログイン / ログアウトの手続きを一元化する。

- token を `localStorage` に保存 / 削除するのはここだけ
- ヘッダーの「ログアウト」ボタンから呼ばれる
- FE-α4 の保護ルートから「ログインしているか」を問い合わせられる

小規模アプリなので Zustand ではなく **React Context** でOK。

### 受け入れ条件

- [ ] `src/contexts/AuthContext.tsx`（または同等）が存在する
- [ ] `useAuth()` フックで `{ user, login, logout, isAuthenticated }` が取得できる
- [ ] アプリ起動時に `localStorage` の token を読み、あれば `GET /api/auth/me` で user を復元する
- [ ] `login()` はトークンを保存し、`user` をセットする（or `me` を呼んで取得）
- [ ] `logout()` は `POST /api/auth/logout` を叩き、token を削除し、`/login` へ遷移
- [ ] ヘッダーに「ログアウト」ボタンが表示され、押すとログアウトできる

### 仕様

#### `useAuth()` の返り値

```ts
type User = { id: number; student_id: string };

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;  // token 保存 + user 取得
  logout: () => Promise<void>;              // サーバーに通知 + token 削除
};
```

FE-α1 のログイン処理は「`api.post('/auth/login', ...)` で取得した token を `login(token)` に渡す」ようにリファクタする。

### 実装手順

#### 1. `src/contexts/AuthContext.tsx` を作成

骨格：

```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type User = { id: number; student_id: string };

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  // 起動時に token があれば user を復元
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    api.get<User>("/auth/me")
      .then(setUser)
      .catch(() => {
        // token が壊れている → 削除
        localStorage.removeItem("access_token");
      });
  }, []);

  async function login(token: string) {
    localStorage.setItem("access_token", token);
    const me = await api.get<User>("/auth/me");
    setUser(me);
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("access_token");
      setUser(null);
      navigate("/login");
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}
```

#### 2. `main.tsx` で `<AuthProvider>` を差し込む

`<BrowserRouter>` の **内側** に置く（`useNavigate` を使うため）：

```tsx
<BrowserRouter>
  <AuthProvider>
    <App />
  </AuthProvider>
</BrowserRouter>
```

#### 3. FE-α1 の `LoginPage` を書き換え

直接 `setItem` していた箇所を `useAuth().login(token)` に：

```tsx
const { login } = useAuth();
// ...
const data = await api.post<LoginResponse>("/auth/login", {...});
await login(data.access_token);
navigate("/");
```

#### 4. `Layout.tsx` にログアウトボタンを追加

```tsx
const { logout, user } = useAuth();

<header>
  <nav>
    <Link to="/">カレンダー</Link>
    <Link to="/courses">時間割</Link>
    <span>{user?.student_id}</span>
    <button onClick={logout}>ログアウト</button>
  </nav>
</header>
```

#### 5. 動作確認

- ログイン → ヘッダーに学籍番号が出る
- ページリロードしても状態が維持される（`me` で復元される）
- ログアウトボタン → `/login` に遷移 / localStorage から token 消失
- 開発者ツールの Network タブで `POST /api/auth/logout` が呼ばれていることを確認

### 考え方のヒント

- **Context は「状態」と「状態を変える手続き」をセットで提供する**。コンポーネント側は中身の実装（localStorage か否か）を知らなくてよい
- **`useEffect` の依存配列は `[]`**（起動時に1度だけ `me` を呼ぶ）。依存を指定しすぎるとログアウト直後に再取得してしまう
- **`logout()` の中で `api.post('/auth/logout')` が失敗しても、ローカルの token は削除する**。サーバー側が死んでいてもクライアント側でログアウト状態に持ち込めるようにする（`try/finally`）
- **`isAuthenticated: !!user` はオブジェクトを真偽値に変換するイディオム**。`user === null` と書いても同じ
- 規模が大きくなったら Zustand / Redux に移行する選択肢もあるが、今回は Context で十分

### 参考

- [React 公式: Context](https://ja.react.dev/reference/react/useContext)
- [BE-A4 `get_current_user`](./backend-auth.md#be-a4-get-apiauthme--get_current_user-depends) — `/api/auth/me` の仕様

---

## FE-α4 未ログイン時のガード（保護ルート）

**担当**: Frontend 担当α

### 目的

未ログインで `/` や `/courses` にアクセスしたら `/login` にリダイレクトする。ログイン済みなら素通し。

### 受け入れ条件

- [ ] 未ログイン状態で `/` にアクセス → `/login` にリダイレクトされる
- [ ] 未ログイン状態で `/courses` にアクセス → `/login` にリダイレクトされる
- [ ] ログイン済み状態で `/` にアクセス → カレンダー画面が表示される
- [ ] `/login`, `/register` はログイン有無に関わらずアクセス可能
- [ ] 起動直後の一瞬で `/login` にフラッシュしないよう、`me` の取得中は「読み込み中」等を出す

### 仕様

#### 挙動

```
未ログイン ─→ / or /courses ─→ <Navigate to="/login" />
ログイン済 ─→ / or /courses ─→ <Outlet /> （通常表示）
```

### 実装手順

#### 1. `components/ProtectedRoute.tsx`（or `RequireAuth.tsx`）を作成

骨格：

```tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
```

#### 2. `App.tsx` のルートを入れ子にする

```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />

  {/* 保護ルート: ProtectedRoute → Layout → 各ページ */}
  <Route element={<ProtectedRoute />}>
    <Route element={<Layout />}>
      <Route path="/" element={<CalendarPage />} />
      <Route path="/courses" element={<CoursesPage />} />
    </Route>
  </Route>
</Routes>
```

#### 3. 「読み込み中」対策

[FE-α3](#fe-α3-認証状態管理authcontext) で `AuthProvider` が起動時に `GET /api/auth/me` を叩く間は、`user` が一瞬 `null` になる。このまま素直に書くと **ログイン済みなのに `/login` にフラッシュ** する。

対策：`AuthContext` に `loading` を持たせる：

```tsx
// AuthContext.tsx
const [loading, setLoading] = useState(true);

useEffect(() => {
  const token = localStorage.getItem("access_token");
  if (!token) {
    setLoading(false);
    return;
  }
  api.get<User>("/auth/me")
    .then(setUser)
    .catch(() => localStorage.removeItem("access_token"))
    .finally(() => setLoading(false));
}, []);
```

`ProtectedRoute` で `loading` を見る：

```tsx
const { isAuthenticated, loading } = useAuth();
if (loading) return <div>読み込み中...</div>;
if (!isAuthenticated) return <Navigate to="/login" replace />;
return <Outlet />;
```

#### 4. 動作確認

- シークレットウィンドウで `http://localhost:5173/` → `/login` へ即リダイレクト
- ログイン → `/` に戻る
- リロード → 一瞬「読み込み中」を経て `/` のまま（`/login` にフラッシュしない）
- localStorage.removeItem → リロードで `/login` へ

### 考え方のヒント

- **`<Navigate replace />` の `replace` 属性を付ける**と、ブラウザ履歴に `/` → `/login` の往復が残らない。「戻る」で無限ループしない
- **`loading` フラグを持たないと認証済みでも `/login` に飛ぶ**。サーバーと通信している間は `isAuthenticated` が false だから。初心者がハマりやすい
- ログアウト直後に保護ルートに居ると、AuthContext の `logout()` 内で `navigate('/login')` しているので、`ProtectedRoute` は同じ判定で通っても問題ない（どちらが先でも最終的に `/login`）
- より本格的にやるなら「元居たURL」を覚えてログイン後に戻す（`navigate(from)`）が、今回は不要

### 参考

- [React Router: Protected Routes パターン](https://reactrouter.com/en/main/start/concepts#authentication)
