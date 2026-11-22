import { describe, expect, it } from 'vitest';
import { HALOS } from '../src/logic/flow';
import { PULSE_AMPLITUDE, STARS, brightness, packStarGlow } from '../src/logic/stars';

describe('stars', () => {
  it('月 + 星 11 個', () => {
    expect(STARS.length).toBe(12);
  });
  it('明るさの倍率は常に 0.9〜1.1', () => {
    for (const s of STARS) {
      for (let t = 0; t < 120; t += 0.07) {
        const b = brightness(s, t);
        expect(b).toBeGreaterThanOrEqual(1 - PULSE_AMPLITUDE - 1e-9);
        expect(b).toBeLessThanOrEqual(1 + PULSE_AMPLITUDE + 1e-9);
      }
    }
  });
  it('星ごとに位相が異なる', () => {
    expect(new Set(STARS.map((s) => s.phase)).size).toBe(STARS.length);
  });
  it('周期は数秒で、星ごとにばらける', () => {
    for (const s of STARS) {
      expect(s.period).toBeGreaterThanOrEqual(4);
      expect(s.period).toBeLessThanOrEqual(8);
    }
    expect(new Set(STARS.map((s) => s.period)).size).toBe(STARS.length);
  });
  it('packStarGlow は長さ STARS.length*4 で、値が brightness - 1 と一致する', () => {
    const t = 3.7;
    const out = packStarGlow(t);
    expect(out.length).toBe(STARS.length * 4);
    STARS.forEach((s, i) => {
      expect(out[i * 4]).toBeCloseTo(s.center.x, 6);
      expect(out[i * 4 + 1]).toBeCloseTo(s.center.y, 6);
      expect(out[i * 4 + 2]).toBeCloseTo(s.radius, 6);
      expect(out[i * 4 + 3]).toBeCloseTo(brightness(s, t) - 1, 6);
    });
  });
  it('flow.ts の HALOS は STARS と位置・半径・向きが一致する', () => {
    expect(HALOS.length).toBe(STARS.length);
    STARS.forEach((s, i) => {
      expect(HALOS[i].center).toEqual(s.center);
      expect(HALOS[i].radius).toBe(s.radius);
      expect(HALOS[i].dir).toBe(s.dir);
    });
  });
});
