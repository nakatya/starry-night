import { describe, expect, it } from 'vitest';
import { PULSE_AMPLITUDE, STARS, brightness } from '../src/logic/stars';

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
    expect(new Set(STARS.map((s) => s.period)).size).toBeGreaterThan(6);
  });
});
