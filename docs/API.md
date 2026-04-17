# バックエンドとの通信ガイド

フロントエンド（TypeScript）から FastAPI へリクエストを送る方法をまとめたガイドです(AI作成)。
参考程度に

---

## 基本パターン

`fetch` を使って API にリクエストを送る。必ず `async / await` で書く。

```ts
// GET リクエスト
async function getUsers(): Promise<User[]> {
  const res = await fetch('/api/users');
  if (!res.ok) {
    throw new Error(`エラー: ${res.status}`);
  }
  const data: User[] = await res.json();
  return data;
}

// POST リクエスト
async function createUser(name: string, email: string): Promise<User> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email }),
  });
  if (!res.ok) {
    throw new Error(`エラー: ${res.status}`);
  }
  const data: User = await res.json();
  return data;
}
```

---

## レスポンスの型定義

API が返す JSON の構造に合わせて `interface` を定義する。  
FastAPI のスキーマと合わせておくと型の恩恵を受けやすい。

```ts
// src/types.ts にまとめて管理すると便利
interface User {
  id: number;
  name: string;
  email: string;
}

interface ApiError {
  detail: string;
}
```

### FastAPI 側のスキーマと対応させる

```python
# backend/app/schemas/user.py
from pydantic import BaseModel

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
```

```ts
// frontend/src/types.ts
interface User {
  id: number;
  name: string;
  email: string;
}
```

> フィールド名・型を FastAPI 側と一致させる。ずれると実行時エラーになる。

---

## エラーハンドリング

```ts
async function getUsers(): Promise<void> {
  try {
    const res = await fetch('/api/users');

    if (!res.ok) {
      // HTTPエラー（4xx, 5xx）
      const error: ApiError = await res.json();
      showError(error.detail);
      return;
    }

    const users: User[] = await res.json();
    renderUsers(users);

  } catch (error) {
    // ネットワークエラー（サーバーに繋がらないなど）
    showError('サーバーに接続できませんでした');
  }
}
```

### ステータスコードの目安

| ステータス | 意味 | 対処 |
|---|---|---|
| `200` | 成功 | レスポンスを使う |
| `400` | リクエストが不正 | 入力値を確認する |
| `404` | リソースが見つからない | 存在しないIDなど |
| `422` | バリデーションエラー | FastAPI が型チェックで弾いた |
| `500` | サーバー内部エラー | バックエンドのログを確認する |

---

## CORS(Cross-Origin Resource Sharing) エラーへの対処

フロントエンド（localhost:5173）からバックエンド（localhost:8000）にリクエストを送ると、オリジンが異なるため CORS エラーが発生する。

```
Access to fetch at 'http://localhost:8000/api/users' from origin
'http://localhost:5173' has been blocked by CORS policy
```

### FastAPI 側で CORS を設定する

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # 開発時のフロントエンドのURL
    allow_methods=["*"],
    allow_headers=["*"],
)
```

> 本番環境では `allow_origins` を実際のドメインに変更する。`["*"]` は開発時のみ許可。

---

## API の URL 管理

開発・本番でURLが変わるため、定数としてまとめておく。

```ts
// src/api.ts
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

export async function getUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/api/users`);
  if (!res.ok) throw new Error(`エラー: ${res.status}`);
  return res.json();
}
```

```bash
# frontend/.env.local（gitignore 済み）
VITE_API_BASE=http://localhost:8000
```

> `VITE_` から始まる環境変数だけが Vite でブラウザに公開される。

---

## フォームの送信パターン

```ts
const form = document.querySelector<HTMLFormElement>('#login-form');

form?.addEventListener('submit', async (e) => {
  e.preventDefault(); // ページのリロードを防ぐ

  const nameInput = document.querySelector<HTMLInputElement>('#name');
  const emailInput = document.querySelector<HTMLInputElement>('#email');

  if (!nameInput || !emailInput) return;

  try {
    const user = await createUser(nameInput.value, emailInput.value);
    console.log('作成成功:', user);
  } catch (error) {
    console.error('作成失敗:', error);
  }
});
```
