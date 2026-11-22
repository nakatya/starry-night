## 目的
Vite + TypeScript + WebGL の雛形を作り、「星月夜」が画面いっぱいに静止画で表示される状態にする。

## やること
- `package.json` に `dev` / `build` / `typecheck` / `test` スクリプトを用意(CLAUDE.md のコマンドと一致させる)。依存は typescript / vite / vitest のみ
- TypeScript は strict。Vitest を導入する
- CLAUDE.md の「画像の扱い」に従って `public/starry-night.jpg` を取得してコミットし、`docs/CREDITS.md` に出典を書く
- `src/logic/cover.ts`: 画面サイズ・絵のサイズ・フォーカス点(0.45, 0.40)から、絵のどの範囲を表示するか(UV の範囲)を返す純粋関数。テストを書く(横長・縦長・同じ比率・フォーカス点が端に寄っても範囲が 0〜1 をはみ出さない)
- `src/gl/`: WebGL の初期化、全画面の四角形、テクスチャ読み込み、シェーダーのコンパイル(エラー時はコンソールに出す)
- 全画面の canvas。リサイズ・画面の向きの変更に追従。`devicePixelRatio` は上限 2
- WebGL が使えないときは CSS の背景画像(cover)で表示する
- 読み込み中は黒、準備ができたら 0.8 秒でフェードイン
- `vite.config.ts` の `base` は `./`
- `.gitignore`(node_modules, dist)

## 受け入れ条件
- [ ] `npm ci && npm run typecheck && npm test && npm run build` が通る
- [ ] `npm run dev` で、絵が縦横比を保ったまま画面全体を覆って表示される(黒帯・余白・スクロールバーなし)
- [ ] ウィンドウを縦長・横長に変えても、常に画面いっぱいで、中央の大きな渦が画面内に入る
- [ ] `docs/CREDITS.md` に画像の出典とパブリックドメインである旨が書かれている
