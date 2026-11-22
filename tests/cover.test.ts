import { describe, expect, it } from 'vitest';
import { coverBackgroundPosition, coverUvRect } from '../src/logic/cover';

describe('coverBackgroundPosition(具体値)', () => {
  const img = { width: 2560, height: 2027 };
  it('縦長では y が 0、x は 0〜100% に収まる', () => {
    const p = coverBackgroundPosition({ width: 390, height: 844 }, img);
    expect(p.y).toBe(0);
    expect(p.x).toBeGreaterThan(0);
    expect(p.x).toBeLessThan(100);
  });
  it('正方形の画面: 横を切る。フォーカス 0.45 から x を具体値で確認', () => {
    // 表示幅 w = 2027/2560、u0 = 0.45 - w/2、p = u0 / (1 - w)
    const w = 2027 / 2560;
    const p = coverBackgroundPosition({ width: 1000, height: 1000 }, img);
    expect(p.x).toBeCloseTo(((0.45 - w / 2) / (1 - w)) * 100, 6);
    expect(p.y).toBe(0);
  });
  it('同じ比率なら 0, 0', () => {
    expect(coverBackgroundPosition({ width: 2560, height: 2027 }, img)).toEqual({ x: 0, y: 0 });
  });
  it('極端な縦横比でも 0〜100% に収まる', () => {
    for (const s of [
      { width: 10, height: 5000 },
      { width: 5000, height: 10 },
    ]) {
      const p = coverBackgroundPosition(s, img);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(100);
    }
  });
});

describe('coverBackgroundPosition', () => {
  const imageSize = { width: 2560, height: 2027 };
  const check = (s: { width: number; height: number }) => {
    const p = coverBackgroundPosition(s, imageSize);
    const r = coverUvRect(s, imageSize);
    const w = r.u1 - r.u0;
    const h = r.v1 - r.v0;
    // CSS の位置から逆算した表示開始位置が coverUvRect と一致する
    return { p, u0: (p.x / 100) * (1 - w), v0: (p.y / 100) * (1 - h), r };
  };
  it('縦長でも coverUvRect と同じ範囲になる', () => {
    const { u0, v0, r } = check({ width: 390, height: 844 });
    expect(u0).toBeCloseTo(r.u0, 9);
    expect(v0).toBeCloseTo(r.v0, 9);
  });
  it('横長でも coverUvRect と同じ範囲になる', () => {
    const { u0, v0, r, p } = check({ width: 2560, height: 800 });
    expect(u0).toBeCloseTo(r.u0, 9);
    expect(v0).toBeCloseTo(r.v0, 9);
    expect(p.x).toBe(0);
  });
});

const image = { width: 2560, height: 2027 };

function expectInRange(r: { u0: number; v0: number; u1: number; v1: number }) {
  expect(r.u0).toBeGreaterThanOrEqual(0);
  expect(r.v0).toBeGreaterThanOrEqual(0);
  expect(r.u1).toBeLessThanOrEqual(1 + 1e-9);
  expect(r.v1).toBeLessThanOrEqual(1 + 1e-9);
}

describe('coverUvRect', () => {
  it('同じ比率なら全体を表示する', () => {
    const r = coverUvRect({ width: 1280, height: 1013.5 }, image);
    expect(r.u0).toBeCloseTo(0);
    expect(r.v0).toBeCloseTo(0);
    expect(r.u1).toBeCloseTo(1);
    expect(r.v1).toBeCloseTo(1);
  });

  it('横長の画面では横は全部、縦を切り落としフォーカス点を中心にする', () => {
    const r = coverUvRect({ width: 1920, height: 600 }, image);
    expect(r.u0).toBeCloseTo(0);
    expect(r.u1).toBeCloseTo(1);
    const h = r.v1 - r.v0;
    expect(h).toBeLessThan(1);
    expect((r.v0 + r.v1) / 2).toBeCloseTo(0.4);
    expectInRange(r);
  });

  it('縦長の画面では縦は全部、横を切り落としフォーカス点を中心にする', () => {
    const r = coverUvRect({ width: 400, height: 800 }, image);
    expect(r.v0).toBeCloseTo(0);
    expect(r.v1).toBeCloseTo(1);
    expect(r.u1 - r.u0).toBeLessThan(1);
    expect((r.u0 + r.u1) / 2).toBeCloseTo(0.45);
    expectInRange(r);
  });

  it('表示範囲の縦横比が画面と一致する(絵のピクセル換算)', () => {
    const screen = { width: 390, height: 844 };
    const r = coverUvRect(screen, image);
    const aspect = ((r.u1 - r.u0) * image.width) / ((r.v1 - r.v0) * image.height);
    expect(aspect).toBeCloseTo(screen.width / screen.height);
  });

  it('フォーカス点が端に寄っても範囲が 0〜1 をはみ出さない', () => {
    for (const focus of [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
    ]) {
      for (const screen of [
        { width: 300, height: 900 },
        { width: 2000, height: 300 },
        { width: 1000, height: 1000 },
      ]) {
        expectInRange(coverUvRect(screen, image, focus));
      }
    }
  });

  it('極端な縦長でも中央の大きな渦(0.47, 0.33)が入る', () => {
    const r = coverUvRect({ width: 360, height: 780 }, image);
    expect(0.47).toBeGreaterThan(r.u0);
    expect(0.47).toBeLessThan(r.u1);
    expect(0.33).toBeGreaterThan(r.v0);
    expect(0.33).toBeLessThan(r.v1);
  });
});
