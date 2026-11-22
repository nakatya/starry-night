# CLAUDE.md

## プロジェクト概要
フィンセント・ファン・ゴッホ「星月夜」(1889年、パブリックドメイン)を画面いっぱいに表示し、空のうねりだけがゆっくり流れ続ける背景サイト。
操作やゲーム要素はない。開いて眺めるだけの画面。
仕様は `docs/DESIGN.md` を正とする。

## 技術スタック
- TypeScript(strict)
- WebGL(素の WebGL1 / WebGL2。描画ライブラリは使わない)
- Vite(開発サーバ・ビルド)
- Vitest(ロジックのユニットテスト)
- 公開先: GitHub Pages(`dist/` を配信)

## コマンド
- 依存インストール: `npm ci`
- 開発サーバ: `npm run dev`
- 型チェック: `npm run typecheck`
- テスト: `npm test`
- ビルド: `npm run build`

PR を出す前に `npm run typecheck && npm test && npm run build` が通ることを必ず確認する。

## ディレクトリ構成(目標)
```
public/
  starry-night.jpg   # 絵の画像(Wikimedia Commons、パブリックドメイン)
src/
  main.ts            # 起動。キャンバス作成、WebGL 初期化、ループ
  gl/                # WebGL の初期化、シェーダーのコンパイル、テクスチャ読み込み
  shaders/           # GLSL(.glsl を ?raw で読み込む、または .ts の文字列)
  logic/             # 描画に依存しない純粋な計算(cover の計算、渦の配置、流れの速度場)→ テスト対象
tests/               # Vitest
docs/
```
座標計算や流れ場の数式は `src/logic/` に純粋関数として置き、WebGL に依存させない。これをテストする。
シェーダー側の流れ場は `src/logic/` の定義(渦の位置・強さ)から uniform で受け取り、両者で同じ値を使う。

## 画像の扱い
- 絵の画像は Wikimedia Commons の「Van Gogh - Starry Night - Google Art Project.jpg」の縮小版(長辺 2560px 程度)を使う。
  取得例: `curl -L -A "starry-night-site" -o public/starry-night.jpg "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/2560px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg"`
- 取得したら、JPEG として開けること・サイズ(おおよそ 2560×2027)を確認してからコミットする。1ファイル 3MB を超える場合は品質を下げて再圧縮する。
- 出典とライセンス(パブリックドメイン)を `docs/CREDITS.md` に記録する。
- 他の画像素材は追加しない。必要なマスクなどはコードで生成する。

## 作業ルール
- 1 Issue = 1 PR。PR は小さく保ち、Issue の受け入れ条件を満たす範囲だけを変更する。
- ブランチ名: `claude/issue-<番号>-<短い説明>`
- PR 本文に「対応した Issue(Closes #番号)」「変更内容」「確認方法(どう見れば確認できるか)」を書く。
- 新しい依存パッケージの追加は最小限にし、追加した理由を PR に書く。

## 止まって人に聞くべきこと(必須)
次のいずれかに当たる場合は、実装を進めずに Issue / PR にコメントで質問し、`needs-human` ラベルを付けて停止する。
- 仕様が曖昧で、見た目や動きの印象を大きく左右する判断が必要なとき
- `docs/DESIGN.md` の内容を変える必要があるとき
- `.github/workflows/`、`CLAUDE.md`、`package.json` の依存を大きく変える必要があるとき
- 絵の画像が取得できないとき(別の入手先を勝手に使わない)
- 同じエラーを3回直そうとして解決しないとき
- Issue の範囲を超える大きな変更が必要だと判断したとき

## やってはいけないこと
- `main` への直接 push
- シークレットや API キーをコードやログに書くこと
- テストを消したり、無効化したりして CI を通すこと
