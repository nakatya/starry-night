import type { Point } from './cover';

/**
 * 空のマスク。動かしてよい範囲(空)= 1、糸杉・丘・村 = 0。
 * 座標は絵の割合(左上 0,0、右下 1,1)。public/starry-night.jpg(1920×1520)を見て合わせた。
 */

/** 地平線(丘の稜線)。左から右へ。これより下は動かさない */
export const HORIZON: readonly Point[] = [
  { x: 0, y: 0.74 },
  { x: 0.2, y: 0.74 },
  { x: 0.36, y: 0.75 },
  { x: 0.43, y: 0.68 },
  { x: 0.5, y: 0.715 },
  { x: 0.565, y: 0.665 },
  { x: 0.65, y: 0.63 },
  { x: 0.73, y: 0.655 },
  { x: 0.78, y: 0.625 },
  { x: 0.83, y: 0.61 },
  { x: 0.885, y: 0.57 },
  { x: 0.91, y: 0.53 },
  { x: 0.955, y: 0.53 },
  { x: 1, y: 0.59 },
];

/** 糸杉の輪郭(閉じた多角形)。先端から右側を下り、下端を通って左側を上る */
export const CYPRESS: readonly Point[] = [
  { x: 0.195, y: 0.055 },
  { x: 0.205, y: 0.07 },
  { x: 0.205, y: 0.16 },
  { x: 0.215, y: 0.27 },
  { x: 0.225, y: 0.4 },
  { x: 0.24, y: 0.5 },
  { x: 0.26, y: 0.56 },
  { x: 0.29, y: 0.58 },
  { x: 0.3, y: 0.66 },
  { x: 0.34, y: 0.7 },
  { x: 0.375, y: 0.75 },
  { x: 0.385, y: 0.82 },
  { x: 0.43, y: 0.78 },
  { x: 0.46, y: 0.86 },
  { x: 0.47, y: 1 },
  { x: 0.12, y: 1 },
  { x: 0.125, y: 0.86 },
  { x: 0.125, y: 0.79 },
  { x: 0.135, y: 0.66 },
  { x: 0.145, y: 0.53 },
  { x: 0.15, y: 0.33 },
  { x: 0.16, y: 0.25 },
  { x: 0.18, y: 0.15 },
  { x: 0.185, y: 0.07 },
];

/** 教会の尖塔(閉じた多角形)。先端は地平線より上に出るため、別に 0 にする */
export const SPIRE: readonly Point[] = [
  { x: 0.564, y: 0.632 },
  { x: 0.5695, y: 0.665 },
  { x: 0.574, y: 0.72 },
  { x: 0.58, y: 0.8 },
  { x: 0.55, y: 0.8 },
  { x: 0.556, y: 0.72 },
  { x: 0.5595, y: 0.665 },
];

/** 地平線の y(x での線形補間) */
export function horizonY(x: number): number {
  const h = HORIZON;
  if (x <= h[0].x) return h[0].y;
  for (let i = 1; i < h.length; i++) {
    if (x <= h[i].x) {
      const t = (x - h[i - 1].x) / (h[i].x - h[i - 1].x);
      return h[i - 1].y + (h[i].y - h[i - 1].y) * t;
    }
  }
  return h[h.length - 1].y;
}

export function pointInPolygon(x: number, y: number, poly: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** ぼかす前のマスク値。空なら 1、それ以外は 0 */
export function maskAt(x: number, y: number): 0 | 1 {
  if (y >= horizonY(x)) return 0;
  if (pointInPolygon(x, y, CYPRESS)) return 0;
  if (pointInPolygon(x, y, SPIRE)) return 0;
  return 1;
}

/** 箱ぼかし(横→縦、端は端の値を延長)。radius は px */
export function boxBlur(src: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return src.slice();
  const tmp = new Uint8Array(src.length);
  const out = new Uint8Array(src.length);
  const n = radius * 2 + 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let s = 0;
      for (let k = -radius; k <= radius; k++) {
        s += src[y * width + Math.min(width - 1, Math.max(0, x + k))];
      }
      tmp[y * width + x] = Math.round(s / n);
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let s = 0;
      for (let k = -radius; k <= radius; k++) {
        s += tmp[Math.min(height - 1, Math.max(0, y + k)) * width + x];
      }
      out[y * width + x] = Math.round(s / n);
    }
  }
  return out;
}

/** マスクを width×height の 0〜255 の配列として作る(起動時に一度だけ呼ぶ) */
export function buildMask(width: number, height: number, blurRadius = 2): Uint8Array {
  const raw = new Uint8Array(width * height);
  for (let x = 0; x < width; x++) {
    const u = (x + 0.5) / width;
    const horizon = horizonY(u); // 列ごとに 1 回だけ
    // 地平線より下の行は 0 のまま(配列の初期値)なので計算しない
    const yEnd = Math.min(height, Math.ceil(horizon * height - 0.5));
    for (let y = 0; y < yEnd; y++) {
      const v = (y + 0.5) / height;
      if (v >= horizon) break;
      if (pointInPolygon(u, v, CYPRESS) || pointInPolygon(u, v, SPIRE)) continue;
      raw[y * width + x] = 255;
    }
  }
  return boxBlur(raw, width, height, blurRadius);
}
