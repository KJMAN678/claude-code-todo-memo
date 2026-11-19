# todo-memo

Claude Code の mod。`/memo` で明日やることを**モデルを動かさずに**メモし、次回セッションの開始時にプロンプト上の帯で確認できる。

## 解決したいこと

「明日やること」を普通のプロンプトとして入力すると、Claude のモデルが走ってしまう。この mod は `/memo` というスラッシュコマンドでその入力を受け取り、保存だけをして終わる。モデルは呼ばれず、メモの内容もモデルの文脈に入らない。

## 使い方

| 入力 | 動作 |
| --- | --- |
| `/memo 明日はPRレビュー` | メモを追加する |
| `/memo` | メモの一覧を表示する |
| `/memo done 2` | 2 番のメモを削除する（済にする） |
| `/memo clear` | すべてのメモを削除する |

メモが 1 件以上ある間、プロンプト入力欄の上に「TODO メモ」の帯が出る。各行の「済」ボタンを押すと、そのメモが消える。

- 帯が表示されるのは、ターミナル、デスクトップ、モバイル。VS Code では表示されない（`/memo` での一覧は使える）。
- `done ...` や `clear` で始まる文は、メモではなくサブコマンドとして扱われる。

## インストール（ローカル marketplace）

このフォルダ自体が marketplace になっている（[.claude-plugin/marketplace.json](.claude-plugin/marketplace.json)）。

1. デスクトップアプリで、プロンプト横の **+** → Plugins → Add marketplace を開く
2. このフォルダの絶対パスを入力して Add する
3. Add plugin で `todo-memo` を選び、スコープは user にする（全セッションで有効になる）

ターミナルの場合は、次のとおり。

```text
/plugin marketplace add https://github.com/KJMAN678/claude-code-todo-memo
/plugin install todo-memo@todo-memo-local
```

フォルダを直接読むので、コードを直したあとは `/reload-plugins` で反映される。

## しくみ

| ファイル | 役割 |
| --- | --- |
| [hooks/register.tsx](hooks/register.tsx) | mod 本体（約 110 行） |
| [types/index.d.ts](types/index.d.ts) | 帯の描画に使う状態 `todo-memo.memos` の型 |
| [hooks/memo.test.tsx](hooks/memo.test.tsx) | テスト |
| [.claude-plugin/plugin.json](.claude-plugin/plugin.json) | mod の定義 |

- **モデルを呼ばない**: `command.run` のフックが `next()` を呼ばずに自分で答えを返すので、コマンドは実行されず、モデルにも渡らない。返す文字列には `isTextDisplayOnly` を付けてあり、以降のモデル呼び出しにも含まれない。
- **保存先**: mod の内部ストア（`$.store`）。Claude Code の設定ディレクトリ内の JSON ファイルで、プロジェクトをまたいで共通。
- **同時利用でも消えない**: 追加、削除、「済」ボタンのどれでも、書き込む前にストアを読み直してから変更する。別のセッションが追加したメモを古い一覧で上書きしない。
- **帯の描画**: ストアの内容を `$.state` に写して `AbovePrompt` の帯に描く。別のセッションで追加したメモは、このセッションの帯には再読み込みまで出ない。

## 開発

```bash
claude plugin validate <このフォルダ>
claude plugin test <このフォルダ>
```

`plugin test` が使えるのは新しい版の Claude Code だけ。`claude --version` が古い場合は、アプリに同梱されている新しい版を使う。

## 既知の制限

- `done ...` と `clear` で始まるメモは書けない。
- 同じストアを使うため、複数のプロジェクトのメモが 1 つの一覧に混ざる。
- 長い文章も 1 件のメモとして保存される（長さの制限はない）。
