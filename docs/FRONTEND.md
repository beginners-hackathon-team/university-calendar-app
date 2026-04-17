# フロントエンド 開発ガイド

HTML / CSS / TypeScript（フレームワークなし）+ Vite による開発フローをまとめたガイドです(AI作成)。
参考程度に

---

## ファイル構成

```
frontend/
├── index.html          # エントリーポイント
├── public/             # そのまま配信する静的ファイル（画像など）
├── src/
│   ├── main.ts         # TypeScript のエントリーポイント
│   ├── style.css       # スタイル
│   └── api.ts          # バックエンドとの通信処理
├── package.json
└── tsconfig.json
```

### public/ と src/ の違い

| ディレクトリ | 用途 |
|---|---|
| `public/` | 画像・フォントなど、加工せずそのまま配信するファイル |
| `src/` | TypeScript・CSS など、Vite がビルド処理するファイル |

---

## Vite の使い方

### 開発サーバーの起動

```bash
npm run dev
```

起動後、http://localhost:5173 でアプリが確認できる。  
ファイルを保存するたびにブラウザが自動で更新される（ホットリロード）。

### ビルド（デプロイ用）

```bash
npm run build
```

`dist/` に本番用ファイルが出力される。

> デプロイ時は `dist/` の中身を `backend/static/` にコピーして FastAPI から配信する。  
> ビルド先を直接 `backend/static/` に変更したい場合は `vite.config.ts` で設定できる。

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '../backend/static',
    emptyOutDir: true,
  },
});
```

### 型チェック

```bash
npm run typecheck
```

Vite はビルド時に型チェックをしないため、型エラーの確認はこのコマンドで行う。

---

## CSS の管理方針

小規模アプリのため、ファイルは分けすぎない。

```
src/
├── style.css       # 共通スタイル・全体レイアウト
└── components/
    └── login.css   # ページ・コンポーネント固有のスタイル（必要なら）
```

ページが1〜2枚程度であれば `style.css` 1ファイルで十分。

### `style.css` を TypeScript から読み込む

```ts
// main.ts
import './style.css';
```

---

## index.html の書き方

Vite では `index.html` が起点になる。`<script>` で TypeScript ファイルを直接指定できる。

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>アプリ名</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

> `type="module"` を忘れない。これがないと TypeScript の `import` が動かない。
