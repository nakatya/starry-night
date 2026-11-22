import { describe, expect, it } from 'vitest';
import {
  IMAGE_ASPECT,
  MAX_DISPLACEMENT,
  VORTICES,
  flow,
  vortexFlow,
  type Vortex,
} from '../src/logic/flow';

const isolated: Vortex = { center: { x: 0.5, y: 0.5 }, radius: 0.1, strength: 0.004, dir: 1 };

describe('vortexFlow', () => {
  it('半径の外では 0', () => {
    for (const [du, dv] of [
      [0.11, 0],
      [0, 0.2],
      [0.3, 0.3],
      [-0.12, 0.01],
    ]) {
      const f = vortexFlow(0.5 + du, 0.5 + dv, isolated);
      expect(Math.hypot(f.x, f.y)).toBe(0);
    }
  });

  it('渦の中では中心まわりの接線方向を向く(時計回り)', () => {
    for (let a = 0; a < Math.PI * 2; a += 0.5) {
      const r = 0.05;
      const dx = Math.cos(a) * r;
      const dy = Math.sin(a) * r; // 幅を 1 とした長さ
      const f = vortexFlow(0.5 + dx, 0.5 + dy * IMAGE_ASPECT, isolated);
      expect(Math.hypot(f.x, f.y)).toBeGreaterThan(0);
      expect(f.x * dx + f.y * dy).toBeCloseTo(0, 10); // 半径方向の成分は 0
      expect(dx * f.y - dy * f.x).toBeGreaterThan(0); // 時計回り
    }
  });

  it('dir = -1 で逆向き', () => {
    const a = vortexFlow(0.55, 0.5, isolated);
    const b = vortexFlow(0.55, 0.5, { ...isolated, dir: -1 });
    expect(b.y).toBeCloseTo(-a.y, 12);
  });
});

describe('flow', () => {
  it('ずれの大きさが上限を超えない', () => {
    for (let u = 0; u <= 1; u += 0.01) {
      for (let v = 0; v <= 1; v += 0.01) {
        const f = flow(u, v);
        expect(Math.hypot(f.x, f.y)).toBeLessThanOrEqual(MAX_DISPLACEMENT + 1e-12);
      }
    }
  });

  it('渦の内側には動きがある', () => {
    for (const vx of VORTICES) {
      const f = flow(vx.center.x + vx.radius * 0.45, vx.center.y);
      expect(Math.hypot(f.x, f.y)).toBeGreaterThan(0.001);
    }
  });

  it('渦・光輪・帯から離れた場所ではほぼ 0', () => {
    const f = flow(0.99, 0.99);
    expect(Math.hypot(f.x, f.y)).toBeLessThan(1e-6);
  });
});
