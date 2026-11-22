export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** 表示する絵の範囲(UV。0〜1、左上が原点) */
export interface UvRect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

/** 切り落とすときの中心(絵の横 0.45・縦 0.40) */
export const FOCUS: Point = { x: 0.45, y: 0.4 };

/**
 * object-fit: cover と同じ考え方で、画面に表示する絵の範囲を返す。
 * フォーカス点を中心にするが、範囲は常に 0〜1 に収める。
 */
export function coverUvRect(screen: Size, image: Size, focus: Point = FOCUS): UvRect {
  const screenAspect = screen.width / screen.height;
  const imageAspect = image.width / image.height;
  let w = 1;
  let h = 1;
  if (screenAspect > imageAspect) {
    // 画面のほうが横長: 横は全部、縦を切り落とす
    h = imageAspect / screenAspect;
  } else {
    w = screenAspect / imageAspect;
  }
  const u0 = clamp(focus.x - w / 2, 0, 1 - w);
  const v0 = clamp(focus.y - h / 2, 0, 1 - h);
  return { u0, v0, u1: u0 + w, v1: v0 + h };
}

/**
 * object-fit: contain と同じ考え方で、絵の全体が画面に収まる UV の範囲を返す。
 * 絵は画面の中央に置く。余る側の範囲は 0〜1 の外にはみ出す(そこは背景として描く)。
 */
export function containUvRect(screen: Size, image: Size): UvRect {
  const screenAspect = screen.width / screen.height;
  const imageAspect = image.width / image.height;
  let w = 1;
  let h = 1;
  if (screenAspect > imageAspect) {
    // 画面のほうが横長: 縦は全部、左右に余白
    w = screenAspect / imageAspect;
  } else {
    h = imageAspect / screenAspect;
  }
  const u0 = 0.5 - w / 2;
  const v0 = 0.5 - h / 2;
  return { u0, v0, u1: u0 + w, v1: v0 + h };
}

/**
 * coverUvRect と同じ表示範囲になる CSS の background-position(%)を返す。
 * CSS の p% は「はみ出し量 × p」だけ左上へずらすので、p = 開始位置 / (1 - 表示幅) になる。
 * はみ出しがない軸は位置が効かないので 0 を返す。
 */
export function coverBackgroundPosition(
  screen: Size,
  image: Size,
  focus: Point = FOCUS,
): { x: number; y: number } {
  const r = coverUvRect(screen, image, focus);
  const w = r.u1 - r.u0;
  const h = r.v1 - r.v0;
  return {
    x: w >= 1 - 1e-9 ? 0 : (r.u0 / (1 - w)) * 100,
    y: h >= 1 - 1e-9 ? 0 : (r.v0 / (1 - h)) * 100,
  };
}

function clamp(x: number, min: number, max: number): number {
  return Math.min(Math.max(x, min), max);
}
