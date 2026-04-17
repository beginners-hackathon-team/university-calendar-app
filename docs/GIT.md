# Git / GitHub 運用ガイド

チーム開発でのGit・GitHubの使い方をまとめたガイドです(AI作成)。

---

## ブランチ構成

```
main
 └─ develop
      └─ feature/xxx
```

| ブランチ | 役割 | 直接コミット |
|---|---|---|
| `main` | リリース済みの安定版。本番環境に対応 | ❌ 禁止 |
| `develop` | 開発中の統合ブランチ。機能を集約する | ❌ 原則禁止 |
| `feature/xxx` | 機能ごとの作業ブランチ | ✅ ここで作業する |

### ブランチ名の例

Issue 番号を含めることで、ブランチと Issue を紐づける。

```
feature/#{Issue番号}-{作業内容}
```

| Issue | ブランチ名 |
|---|---|
| #3 ログインフォームを作る | `feature/#3-add-login-form` |
| #7 CORSエラーを直す | `feature/#7-fix-cors-error` |
| #12 ユーザー一覧ページ | `feature/#12-user-list-page` |

---

## Issues を使ったタスク管理

作業は基本 Issue を起点にする。「Issue を立てる → ブランチを切る → PR を出す」の流れを守ることで、何のために変更したかが追跡できる。

### Issue の作り方

1. GitHub リポジトリの「Issues」タブを開く
2. 「New issue」をクリック
3. タイトルと内容を記入して「Submit new issue」をクリック

| 項目 | 内容 |
|---|---|
| タイトル | 作業内容を一言で（例：`ログインフォームを作る`） |
| 説明 | やること・完了条件・参考情報など（省略可） |
| Assignees | 担当者を設定する |
| Labels | `feature` / `bug` / `docs` などで分類する |

### Issue からブランチを作る流れ

```
Issue を立てる (#3)
  ↓
feature/#3-add-login-form ブランチを作成
  ↓
作業・コミット
  ↓
PR を作成（Closes #3 を記載）
  ↓
マージと同時に Issue が自動クローズ
```

### Issue が不要な小さな修正の場合

すべての変更に Issue を立てる必要はない。以下を目安にする。

| 変更の規模 | 対応 |
|---|---|
| タイポ・コメント修正・設定の微調整など数行以下 | `develop` に直接コミット |
| 小さいがブランチを切りたい場合 | Issue なしでブランチを作る |
| 機能追加・バグ修正・複数ファイルにまたがる変更 | Issue を立ててからブランチを作る |

Issue なしでブランチを切る場合は、ブランチ名から意図が分かるようにする。

```
fix/typo-header
chore/update-gitignore
docs/add-api-description
```

---

## 基本的な作業フロー

### 1. 作業前：最新の develop を取得する

```bash
git switch develop
git pull origin develop
```

### 2. feature ブランチを作成する

対応する Issue 番号を含めたブランチ名をつける。

```bash
git switch -c feature/#3-add-login-form
```

### 3. 作業・コミットを繰り返す

```bash
# 変更したファイルを確認
git status

# 変更内容を確認
git diff

# ステージに追加
git add src/login.ts

# コミット
git commit -m "ログインフォームのバリデーションを追加"
```

### 4. push 前に develop の最新を取り込む

他の人の変更が develop にマージされている可能性があるため、push の前に取り込んでおく。  
これにより PR 上でのコンフリクトを事前に防げる。

```bash
# develop を最新にする
git switch develop
git pull origin develop

# 作業ブランチに戻り、develop の変更を取り込む
git switch feature/作業内容
git merge develop
```

コンフリクトが起きた場合は [コンフリクトが起きたとき](#コンフリクト競合が起きたとき) を参照して解消する。

### 5. リモートに push する

```bash
git push origin feature/作業内容
```

### 6. GitHub でプルリクエストを作成する

→ [プルリクエストの作り方](#プルリクエストの作り方) を参照

### (7. レビュー・マージ後、ブランチを削除する)

```bash
# ローカルのブランチを削除
git branch -d feature/作業内容
```

---

## コミットの作り方

### 1コミット = 1つの変更

コミットは「ひとつの目的」ごとに区切る。  
まとめてコミットすると、後で何を変えたか追えなくなる。

| 良い例 | 悪い例 |
|---|---|
| `feat: ログインAPIのエンドポイントを追加` | `いろいろ修正` |
| `fix: CORSの設定を追加` | `作業中` |
| `style: ユーザー一覧ページのCSS調整` | `とりあえずコミット` |

### コミットメッセージの書き方

```
種別: 何をしたか（日本語でOK）
```

先頭に種別を付けることで、履歴を見たときに変更の目的が一目で分かる。

| 種別 | 使いどき | 例 |
|---|---|---|
| `feat:` | 新しい機能の追加 | `feat: ログインフォームを追加` |
| `fix:` | バグの修正 | `fix: ログイン時のエラーメッセージを修正` |
| `docs:` | ドキュメントの変更 | `docs: READMEにセットアップ手順を追記` |
| `style:` | 見た目の調整（CSSなど）や空白・インデント整理 | `style: ボタンの色とフォントサイズを調整` |
| `refactor:` | 動作を変えずにコードを整理 | `refactor: fetch処理を関数にまとめる` |
| `chore:` | 設定ファイルや依存関係の変更など | `chore: .gitignoreにdist/を追加` |

```bash
git commit -m "feat: お問い合わせフォームのUIを追加"
git commit -m "fix: CORSエラーを修正"
git commit -m "docs: API一覧をREADMEに追記"
git commit -m "style: ヘッダーのレイアウトを調整"
```

### `git add .` は慎重に

`git add .` はすべてのファイルをまとめてステージする。  
意図しないファイルが含まれることがあるので、基本はファイル名を指定する。

```bash
# ファイルを指定してステージ（推奨）
git add src/api.ts

# ディレクトリ単位もOK
git add src/
```

---

## プルリクエストの作り方

### 手順

1. GitHub のリポジトリページを開く
2. 「Compare & pull request」ボタンをクリック（pushした直後に表示される）
3. 以下を記入して「Create pull request」をクリック

| 項目 | 内容 |
|---|---|
| タイトル | 何をしたかを一言で |
| 説明 | 変更の背景・内容・確認してほしいポイント |
| マージ先 | `develop` ブランチであることを確認する |

### PRの説明テンプレート例

`Closes #番号` を書くと、PR がマージされたときに対応する Issue が自動でクローズされる。

```markdown
## 変更内容
- ログインフォームを追加した
- メールアドレスと入力が空のときにエラーを表示するようにした

## 確認してほしいポイント
- バリデーションのメッセージ文言はこれで良いか

Closes #3
```

### マージは自分でしない

原則として、自分が作成したPRは自分でマージしない。  
チームメンバーにレビューを依頼してからマージする。

---

## コンフリクト（競合）が起きたとき

同じ箇所を複数人が編集するとコンフリクトが発生する。

```
<<<<<<< HEAD
自分の変更内容
=======
相手の変更内容
>>>>>>> develop
```

### 対処手順

1. ファイルを開いて `<<<<<<<`、`=======`、`>>>>>>>` の行を探す
2. 残すべき内容に書き直す（両方残す場合もある）
3. `<<<<<<<` などの記号行をすべて削除する
4. ステージしてコミットする

```bash
git add 競合したファイル
git commit -m "コンフリクトを解消"
```


---

## よくあるミスと対処

### 間違ったブランチで作業してしまった

コミット前であれば、stash で退避できる。

```bash
# 変更を一時退避
git stash

# 正しいブランチに移動
git switch feature/正しいブランチ

# 退避した変更を戻す
git stash pop
```

### コミットメッセージを間違えた（直前のコミットのみ）

```bash
git commit --amend -m "正しいメッセージ"
```

> ただし push 済みのコミットには使わない。

### push したくないファイルを間違えて add した

```bash
# ステージから取り消す（ファイルは変更されたまま残る）
git restore --staged ファイル名
```

---

## .gitignore の使い方

Gitで管理したくないファイルを `.gitignore` に記載する。

```gitignore
# 環境変数（絶対にコミットしない）
.env

# 依存パッケージ（npm install / uv sync で復元できる）
node_modules/
.venv/

# ビルド成果物
dist/
__pycache__/
```

> `.env` は絶対にコミットしない。APIキーやパスワードが含まれるため。

---

## 覚えておくべきコマンド早見表

```bash
# 状態確認
git status                        # 変更されたファイルを確認
git log --oneline                 # コミット履歴を確認
git diff                          # 差分を確認

# ブランチ操作
git switch develop                # ブランチを切り替える
git switch -c feature/xxx         # ブランチを作成して切り替える
git branch                        # ブランチ一覧を表示

# 変更の記録
git add ファイル名                  # ステージに追加
git commit -m "feat: メッセージ"    # コミット（種別: を先頭に付ける）

# リモートとの同期
git pull origin develop           # リモートの変更を取得
git push origin feature/xxx       # リモートに送る
```
