import { describe, expect, it } from 'vitest';
import { boxBlur, buildMask, maskAt } from '../src/logic/mask';

describe('maskAt', () => {
  it('空は 1', () => {
    expect(maskAt(0.47, 0.33)).toBe(1);
    expect(maskAt(0.3, 0.24)).toBe(1);
    expect(maskAt(0.85, 0.3)).toBe(1);
  });
  it('村・丘は 0', () => {
    expect(maskAt(0.6, 0.85)).toBe(0);
    expect(maskAt(0.9, 0.7)).toBe(0);
  });
  it('糸杉は 0', () => {
    expect(maskAt(0.15, 0.6)).toBe(0);
    expect(maskAt(0.2, 0.3)).toBe(0);
  });
});

describe('buildMask', () => {
  it('境界がぼけ、中は 0 / 255', () => {
    const w = 200;
    const h = 160;
    const m = buildMask(w, h, 2);
    expect(m[Math.floor(h * 0.33) * w + Math.floor(w * 0.47)]).toBe(255);
    expect(m[Math.floor(h * 0.85) * w + Math.floor(w * 0.6)]).toBe(0);
    expect(m[Math.floor(h * 0.6) * w + Math.floor(w * 0.15)]).toBe(0);
    expect(m.some((v) => v > 0 && v < 255)).toBe(true);
  });
  it('boxBlur は一様な値を保つ', () => {
    const out = boxBlur(new Uint8Array(25).fill(255), 5, 5, 2);
    expect([...out].every((v) => v === 255)).toBe(true);
  });
});
