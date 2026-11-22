import type { Point } from './cover';

/**
 * 月と星(光輪)。座標は絵の割合(左上 0,0、右下 1,1)。
 * public/starry-night.jpg を見て位置と光輪の半径(絵の幅に対する割合)を合わせた。
 * 周期と位相は星ごとにずらし、同時に明るくなったり暗くなったりしないようにする。
 */
export interface Star {
  center: Point;
  /** 光輪の半径(絵の幅に対する割合) */
  radius: number;
  /** 光輪まわりの回転の強さ(絵の幅に対する割合) */
  spin: number;
  /** 1 = 時計回り、-1 = 反時計回り */
  dir: 1 | -1;
  /** 明るさが脈打つ周期(秒) */
  period: number;
  /** 位相(0..1) */
  phase: number;
}

/** 明るさの倍率の振れ幅(±10%) */
export const PULSE_AMPLITUDE = 0.1;

/** 先頭が月、残りが星 */
export const STARS: readonly Star[] = [
  { center: { x: 0.906, y: 0.19 }, radius: 0.1, spin: 0.0008, dir: 1, period: 7.0, phase: 0.0 },
  { center: { x: 0.11, y: 0.043 }, radius: 0.045, spin: 0.0005, dir: 1, period: 5.3, phase: 0.09 },
  { center: { x: 0.229, y: 0.032 }, radius: 0.035, spin: 0.0005, dir: -1, period: 6.1, phase: 0.18 },
  { center: { x: 0.344, y: 0.038 }, radius: 0.04, spin: 0.0005, dir: 1, period: 4.7, phase: 0.27 },
  { center: { x: 0.411, y: 0.066 }, radius: 0.035, spin: 0.0005, dir: -1, period: 5.9, phase: 0.36 },
  { center: { x: 0.609, y: 0.082 }, radius: 0.05, spin: 0.0005, dir: 1, period: 6.7, phase: 0.45 },
  { center: { x: 0.237, y: 0.172 }, radius: 0.045, spin: 0.0005, dir: -1, period: 4.3, phase: 0.54 },
  { center: { x: 0.698, y: 0.23 }, radius: 0.05, spin: 0.0005, dir: 1, period: 5.6, phase: 0.63 },
  { center: { x: 0.326, y: 0.326 }, radius: 0.035, spin: 0.0005, dir: -1, period: 6.4, phase: 0.72 },
  { center: { x: 0.049, y: 0.451 }, radius: 0.03, spin: 0.0005, dir: 1, period: 4.9, phase: 0.81 },
  { center: { x: 0.134, y: 0.477 }, radius: 0.04, spin: 0.0005, dir: -1, period: 7.3, phase: 0.9 },
  { center: { x: 0.357, y: 0.526 }, radius: 0.06, spin: 0.0005, dir: 1, period: 5.1, phase: 0.95 },
];

/** 時刻 t(秒)での明るさの倍率。常に 1 ± PULSE_AMPLITUDE */
export function brightness(star: Star, t: number): number {
  return 1 + PULSE_AMPLITUDE * Math.sin(2 * Math.PI * (t / star.period + star.phase));
}

/** uniform 用: (cx, cy, radius, 倍率 - 1) の並び */
export function packStarGlow(t: number, out = new Float32Array(STARS.length * 4)): Float32Array {
  STARS.forEach((s, i) => {
    out.set([s.center.x, s.center.y, s.radius, brightness(s, t) - 1], i * 4);
  });
  return out;
}
