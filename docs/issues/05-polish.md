## 目的
公開に向けた仕上げ。配慮と性能、ページの体裁を整える。

## やること
- `prefers-reduced-motion: reduce` のときは動かさず、静止した絵だけを表示する(設定の切り替えにも追従)
- タブが見えないとき(`document.hidden`)は描画ループを止め、戻ったら再開する(時間が飛んでも動きが跳ねない)
- 右下に小さく「Vincent van Gogh, The Starry Night (1889)」と表示(半透明・小さい文字)
- `index.html`: タイトル「The Starry Night」、`<meta name="description">`、OGP(タイトル・説明)、`theme-color` を黒系に、ファビコン(コードで作った簡単な SVG で可)
- スマホのアドレスバーの伸び縮みでも画面いっぱいが保たれる(`100dvh` などを使う)
- README.md に、サイトの説明・公開 URL・確認用パラメータ(`?debug=mask`、`?speed=`)を書く

## 受け入れ条件
- [ ] `npm run typecheck && npm test && npm run build` が通る
- [ ] OS の「視差効果を減らす」をオンにすると、絵が静止する
- [ ] 別のタブから戻っても、動きが跳ねずに続く
- [ ] スマホの縦画面で、アドレスバーが出入りしても余白が出ない
