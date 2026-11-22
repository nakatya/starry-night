import { describe, expect, it } from 'vitest';
import { coverUvRect } from '../src/logic/cover';

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
