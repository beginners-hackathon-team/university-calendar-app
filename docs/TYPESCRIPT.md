# TypeScript 基本ガイド

このプロジェクトで使う TypeScript の書き方をまとめたガイドです(AI作成)。
参考程度に

---

## 型の基本

変数・引数・戻り値に型を付ける。

```ts
// 変数
const name: string = 'Alice';
const age: number = 20;
const isLoggedIn: boolean = false;

// 関数の引数と戻り値
function greet(name: string): string {
  return `こんにちは、${name}`;
}

// 戻り値がない関数
function showError(message: string): void {
  console.error(message);
}
```

### `any` は極力使わない

`any` を使うと型チェックが無効になり、TypeScript を使う意味がなくなる。  
型が分からないときは `unknown` を使い、適切に絞り込む。

```ts
// ❌ 避ける
const data: any = fetchData();

// ✅ 型を定義する
interface User {
  id: number;
  name: string;
}
const data: User = fetchData();
```

---

## DOM(Document Object Model) 操作の型

### querySelector の型指定

`querySelector` の戻り値は `Element | null` になる。  
要素の種類に応じてジェネリクスで型を指定する。

```ts
// ❌ 型が Element | null のままで操作できない
const button = document.querySelector('#submit');
button.addEventListener('click', handleClick); // エラー

// ✅ 型を指定する
const button = document.querySelector<HTMLButtonElement>('#submit');
const input = document.querySelector<HTMLInputElement>('#email');
const form = document.querySelector<HTMLFormElement>('#login-form');
```

### null チェック

`querySelector` は要素が見つからないと `null` を返す。  
必ず存在確認をしてから使う。

```ts
const button = document.querySelector<HTMLButtonElement>('#submit');

// ❌ null チェックなし（実行時エラーになる可能性がある）
button.addEventListener('click', handleClick);

// ✅ null チェックあり
if (button) {
  button.addEventListener('click', handleClick);
}
```


### よく使う HTML 要素の型

| 要素 | 型 |
|---|---|
| `<button>` | `HTMLButtonElement` |
| `<input>` | `HTMLInputElement` |
| `<form>` | `HTMLFormElement` |
| `<div>` | `HTMLDivElement` |
| `<p>` | `HTMLParagraphElement` |
| `<a>` | `HTMLAnchorElement` |
| `<select>` | `HTMLSelectElement` |

---

## オブジェクトの型定義（interface）

API のレスポンスやデータ構造には `interface` を使って型を定義する。

```ts
interface User {
  id: number;
  name: string;
  email: string;
}

interface Post {
  id: number;
  title: string;
  body: string;
  authorId: number;
}
```

### オプショナル（省略可能）なプロパティ

```ts
interface UserForm {
  name: string;
  email: string;
  bio?: string; // ? を付けると省略可能
}
```

---

## 非同期処理（async / await）

API 通信など時間のかかる処理は `async / await` で書く。

```ts
// ❌ Promise チェーン（読みにくい）
fetch('/api/users')
  .then((res) => res.json())
  .then((data) => console.log(data));

// ✅ async / await（読みやすい）
async function getUsers(): Promise<void> {
  const res = await fetch('/api/users');
  const data = await res.json();
  console.log(data);
}
```

### エラーハンドリング

```ts
async function getUsers(): Promise<void> {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) {
      throw new Error(`サーバーエラー: ${res.status}`);
    }
    const data = await res.json();
    console.log(data);
  } catch (error) {
    console.error('取得に失敗しました', error);
  }
}
```

---

## よくある型エラーと対処

### `Object is possibly 'null'`

```ts
// エラー：querySelector の戻り値が null の可能性がある
const input = document.querySelector<HTMLInputElement>('#name');
console.log(input.value); // ❌

// 対処：null チェックを追加する
if (input) {
  console.log(input.value); // ✅
}
```

### `Property does not exist on type`

```ts
// エラー：定義していないプロパティにアクセスしている
interface User {
  name: string;
}
const user: User = { name: 'Alice' };
console.log(user.age); // ❌ age は定義されていない

// 対処：interface に追加するか、アクセスをやめる
interface User {
  name: string;
  age: number; // ✅ 追加
}
```

### `Type 'string | null' is not assignable to type 'string'`

```ts
// エラー：input.value は string だが、input 自体が null の可能性がある
const input = document.querySelector<HTMLInputElement>('#name');
const value: string = input.value; // ❌

// 対処
if (input) {
  const value: string = input.value; // ✅
}
```
