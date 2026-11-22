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

function clamp(x: number, min: number, max: number): number {
  return Math.min(Math.max(x, min), max);
}
