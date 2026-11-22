import { describe, expect, it } from 'vitest';
import { HORIZON, boxBlur, buildMask, horizonY, maskAt, pointInPolygon } from '../src/logic/mask';

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

describe('境界の回帰', () => {
  it('稜線の直上は 1、直下は 0', () => {
    for (const x of [0.1, 0.5, 0.8]) {
      const y = horizonY(x);
      expect(maskAt(x, y - 0.005)).toBe(1);
      expect(maskAt(x, y + 0.005)).toBe(0);
    }
  });
  it('糸杉の輪郭の内外', () => {
    expect(maskAt(0.18, 0.5)).toBe(0); // 幹の内側
    expect(maskAt(0.1, 0.5)).toBe(1); // 左の空
    expect(maskAt(0.3, 0.3)).toBe(1); // 右の空
  });
  it('horizonY は端点を返す', () => {
    expect(horizonY(0)).toBe(HORIZON[0].y);
    expect(horizonY(1)).toBe(HORIZON[HORIZON.length - 1].y);
  });
  it('pointInPolygon の内外', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(pointInPolygon(0.5, 0.5, square)).toBe(true);
    expect(pointInPolygon(1.5, 0.5, square)).toBe(false);
    expect(pointInPolygon(0.5, -0.1, square)).toBe(false);
  });
});
