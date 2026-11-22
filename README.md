# The Starry Night

ゴッホ「星月夜」(1889)を画面いっぱいに表示し、空のうねりがゆっくり流れ続ける背景サイト。

- 公開: https://nakatya.github.io/starry-night/
- 仕様: [docs/DESIGN.md](docs/DESIGN.md)
- 開発の流れ: [docs/SETUP.md](docs/SETUP.md)

## 確認用パラメータ

URL に付けて開く(通常の表示には不要)。

- `?debug=mask` — 動かす範囲(空のマスク)を白黒で重ねて表示する
- `?speed=1.5` — 動きの速さの倍率(既定は 1、`0` で停止)

OS の「視差効果を減らす」がオンのときは、動かさず静止した絵だけを表示する。タブが非表示の間は描画を止める。
