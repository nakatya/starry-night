import type { Point } from './cover';

/**
 * 空の流れ場。座標(u, v)は絵の割合(左上 0,0、右下 1,1)。
 * 戻り値のベクトルは「絵の幅を 1 とした長さ」(x も y も同じ尺度)。
 * UV に直すときは y 方向に IMAGE_ASPECT を掛ける。
 * public/starry-night.jpg(1920×1520)を見て、渦の位置と巻き方向を合わせた。
 */

export const IMAGE_ASPECT = 1920 / 1520;

/** 1周期(秒) */
export const PERIOD_SECONDS = 8;

/** 最大のずれ(絵の幅に対する割合) */
export const MAX_DISPLACEMENT = 0.006;

export interface Vortex {
  center: Point;
  /** 絵の幅に対する割合。この外では流れは 0 */
  radius: number;
  /** 最大の流れの大きさ(絵の幅に対する割合) */
  strength: number;
  /** 1 = 画面上で時計回り、-1 = 反時計回り */
  dir: 1 | -1;
}

/** 空の渦。中央の大きな渦と、その右下の小さな渦(どちらも筆は時計回りに巻く) */
export const VORTICES: readonly Vortex[] = [
  { center: { x: 0.51, y: 0.37 }, radius: 0.15, strength: 0.0045, dir: 1 },
  { center: { x: 0.67, y: 0.48 }, radius: 0.085, strength: 0.0035, dir: 1 },
];

/** 空全体の流れ: 中央を左から右へ横切る波の帯 */
export const BAND = { centerV: 0.42, halfWidth: 0.16, strength: 0.0015 };

/** 月と星(光輪)。ごく弱い回転 */
export const HALOS: readonly Vortex[] = [
  { center: { x: 0.906, y: 0.19 }, radius: 0.1, strength: 0.0008, dir: 1 },
  { center: { x: 0.11, y: 0.043 }, radius: 0.045, strength: 0.0005, dir: 1 },
  { center: { x: 0.229, y: 0.032 }, radius: 0.035, strength: 0.0005, dir: -1 },
  { center: { x: 0.344, y: 0.038 }, radius: 0.04, strength: 0.0005, dir: 1 },
  { center: { x: 0.411, y: 0.066 }, radius: 0.035, strength: 0.0005, dir: -1 },
  { center: { x: 0.609, y: 0.082 }, radius: 0.05, strength: 0.0005, dir: 1 },
  { center: { x: 0.237, y: 0.172 }, radius: 0.045, strength: 0.0005, dir: -1 },
  { center: { x: 0.698, y: 0.23 }, radius: 0.05, strength: 0.0005, dir: 1 },
  { center: { x: 0.326, y: 0.326 }, radius: 0.035, strength: 0.0005, dir: -1 },
  { center: { x: 0.049, y: 0.451 }, radius: 0.03, strength: 0.0005, dir: 1 },
  { center: { x: 0.134, y: 0.477 }, radius: 0.04, strength: 0.0005, dir: -1 },
  { center: { x: 0.357, y: 0.526 }, radius: 0.06, strength: 0.0005, dir: 1 },
];

export interface Vec2 {
  x: number;
  y: number;
}

// 渦の速さの形 s*(1-s²)² の最大値(s = 1/√5 のとき)。最大が strength になるよう正規化する
const PROFILE_PEAK = (1 / Math.sqrt(5)) * 0.8 * 0.8;

/** 中心まわりの接線方向の流れ。半径の外では 0 */
export function vortexFlow(u: number, v: number, vx: Vortex): Vec2 {
  const dx = u - vx.center.x;
  const dy = (v - vx.center.y) / IMAGE_ASPECT; // 幅を 1 とした長さにそろえる
  const r = Math.hypot(dx, dy);
  if (r >= vx.radius || r === 0) return { x: 0, y: 0 };
  const s = r / vx.radius;
  const k = (1 - s * s) * (1 - s * s);
  const speed = (vx.dir * vx.strength * s * k) / PROFILE_PEAK;
  // 画面は y が下向きなので、(-dy, dx) の向きが時計回り
  return { x: (-dy / r) * speed, y: (dx / r) * speed };
}

/** 空全体の横向きの流れ(波の帯) */
export function bandFlow(_u: number, v: number): Vec2 {
  const t = (v - BAND.centerV) / BAND.halfWidth;
  return { x: BAND.strength * Math.exp(-t * t), y: 0 };
}

/**
 * 点(u, v)での流れ。渦 + 空全体の流れ + 光輪の回転。
 * 大きさは MAX_DISPLACEMENT を超えない。
 */
export function flow(u: number, v: number): Vec2 {
  const b = bandFlow(u, v);
  let x = b.x;
  let y = b.y;
  for (const vx of [...VORTICES, ...HALOS]) {
    const f = vortexFlow(u, v, vx);
    x += f.x;
    y += f.y;
  }
  const len = Math.hypot(x, y);
  if (len > MAX_DISPLACEMENT) {
    x = (x / len) * MAX_DISPLACEMENT;
    y = (y / len) * MAX_DISPLACEMENT;
  }
  return { x, y };
}

/** 渦・光輪を uniform 用に (cx, cy, radius, 向き付きの強さ) の並びにする */
export function packVortices(list: readonly Vortex[]): Float32Array {
  const out = new Float32Array(list.length * 4);
  list.forEach((v, i) => {
    out.set([v.center.x, v.center.y, v.radius, v.dir * v.strength], i * 4);
  });
  return out;
}
