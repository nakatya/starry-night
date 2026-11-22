import { coverBackgroundPosition, coverUvRect } from './logic/cover';
import {
  createContext,
  createFullscreenQuad,
  createMaskTexture,
  createProgram,
  createTexture,
  loadImage,
  type GL,
} from './gl/gl';
import { BAND, HALOS, IMAGE_ASPECT, MAX_DISPLACEMENT, PERIOD_SECONDS, VORTICES, packVortices } from './logic/flow';
import { STARS, packStarGlow } from './logic/stars';
import { buildMask } from './logic/mask';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders/quad';

const IMAGE_URL = `${import.meta.env.BASE_URL}starry-night.jpg`;
const MAX_DPR = 2;
const MASK_W = 768;
const MASK_H = 608;

const canvas = document.getElementById('stage') as HTMLCanvasElement;

let fallbackActive = false;
let fallbackImage: HTMLImageElement | null = null;
let fallbackResizeBound = false;

function updateFallbackPosition(): void {
  if (!fallbackActive || !fallbackImage) return;
  // WebGL 経路(coverUvRect)と同じ構図になるよう background-position を計算する
  const p = coverBackgroundPosition(
    { width: canvas.clientWidth || 1, height: canvas.clientHeight || 1 },
    { width: fallbackImage.naturalWidth, height: fallbackImage.naturalHeight },
  );
  canvas.style.backgroundPosition = `${p.x}% ${p.y}%`;
}

function showFallback(): void {
  // WebGL が使えないときは CSS の背景画像(cover)で表示する。画像が読み込めてからフェードインする
  fallbackActive = true;
  if (!fallbackResizeBound) {
    fallbackResizeBound = true;
    window.addEventListener('resize', updateFallbackPosition);
    window.addEventListener('orientationchange', updateFallbackPosition);
  }
  loadImage(IMAGE_URL)
    .then((img) => {
      if (!fallbackActive) return; // WebGL に復帰済み
      fallbackImage = img;
      canvas.style.backgroundImage = `url(${IMAGE_URL})`;
      updateFallbackPosition();
      canvas.classList.add('ready');
    })
    .catch((err) => console.error(err));
}

let contextLost = false;
let imagePromise: Promise<HTMLImageElement> | null = null;
// setup() の世代番号。ロストや再実行で増やし、古い setup() を無効化する
let generation = 0;

async function start(): Promise<void> {
  // コンテキストロスト中は静止画(CSS 背景)を見せ、復帰したら WebGL に戻す
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    contextLost = true;
    generation++; // 進行中の setup() を無効化する
    stopLoop?.();
    showFallback();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    setup().catch((err) => {
      console.error(err);
      showFallback();
    });
  });
  await setup();
}

let stopLoop: (() => void) | null = null;
let listenersBound = false;
let redraw: () => void = () => {};
let onUpdate: () => void = () => {};

async function setup(): Promise<void> {
  const gen = ++generation;
  const gl = createContext(canvas);
  if (!gl) {
    showFallback();
    return;
  }
  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  if (!program) {
    showFallback();
    return;
  }
  gl.useProgram(program);
  createFullscreenQuad(gl, program, 'aPos');

  imagePromise ??= loadImage(IMAGE_URL);
  let image: HTMLImageElement;
  try {
    image = await imagePromise;
  } catch (err) {
    imagePromise = null; // 次の復帰で再試行できるようにする
    throw err;
  }
  // ロスト中・古い setup() は何も作らず終了する(復帰時に改めて setup() が走る)
  if (gen !== generation || contextLost || gl.isContextLost()) return;
  const tex = createTexture(gl, image);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex.texture);
  gl.uniform1i(gl.getUniformLocation(program, 'uImage'), 0);
  // マスクは起動時に一度だけ作る
  const maskTex = createMaskTexture(gl, buildMask(MASK_W, MASK_H), MASK_W, MASK_H);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, maskTex);
  gl.uniform1i(gl.getUniformLocation(program, 'uMask'), 1);
  const debugMask = new URLSearchParams(location.search).get('debug') === 'mask';
  gl.uniform1f(gl.getUniformLocation(program, 'uDebugMask'), debugMask ? 1 : 0);
  // マスク作成時の bindTexture でユニット 0 が上書きされるため、絵のテクスチャを結び直す
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex.texture);
  const params = new URLSearchParams(location.search);
  const speedParam = Number(params.get('speed') ?? 1);
  const speed = Number.isFinite(speedParam) && speedParam >= 0 ? speedParam : 1;
  const u = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform1f(u('uAspect'), IMAGE_ASPECT);
  gl.uniform4f(u('uBand'), BAND.centerV, BAND.halfWidth, BAND.strength, MAX_DISPLACEMENT);
  gl.uniform4fv(u('uVortex[0]'), packVortices(VORTICES));
  gl.uniform4fv(u('uHalo[0]'), packVortices(HALOS));
  const starLoc = u('uStar[0]');
  // 静止時(reduced-motion を含む)は明るさの増減だけ 0 にして、元の絵のままにする。半径は 0 除算を避けるため残す
  const starBuf = new Float32Array(STARS.length * 4);
  packStarGlow(0, starBuf);
  for (let i = 3; i < starBuf.length; i += 4) starBuf[i] = 0;
  gl.uniform4fv(starLoc, starBuf);
  const phaseLoc = u('uPhase');
  const uvLoc = gl.getUniformLocation(program, 'uUvRect');

  const draw = (g: GL): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    g.viewport(0, 0, w, h);
    const r = coverUvRect({ width: w, height: h }, { width: tex.width, height: tex.height });
    g.uniform4f(uvLoc, r.u0, r.v0, r.u1, r.v1);
    g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
  };

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let phase = 0;
  let last = 0;
  let time = 0;
  let rafId = 0;
  const frame = (now: number): void => {
    rafId = 0;
    if (document.hidden || motionQuery.matches) {
      last = 0;
      return;
    }
    // 非表示から戻った直後や時間が飛んだときに跳ねないよう、進みに上限を設ける
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    time += dt * speed;
    phase = (phase + (dt * speed) / PERIOD_SECONDS) % 1;
    gl.uniform1f(phaseLoc, phase);
    gl.uniform4fv(starLoc, packStarGlow(time, starBuf));
    draw(gl);
    rafId = requestAnimationFrame(frame);
  };
  const stillFrame = (): void => {
    // 静止した絵(動き 0、光輪の増減 0)
    gl.uniform1f(phaseLoc, 0);
    packStarGlow(0, starBuf);
    for (let i = 3; i < starBuf.length; i += 4) starBuf[i] = 0;
    gl.uniform4fv(starLoc, starBuf);
    draw(gl);
  };
  const update = (): void => {
    if (motionQuery.matches) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      last = 0;
      stillFrame();
    } else if (!document.hidden && !rafId) {
      last = 0;
      rafId = requestAnimationFrame(frame);
    }
  };
  gl.uniform1f(phaseLoc, 0);
  draw(gl);
  redraw = () => {
    if (!contextLost) draw(gl);
  };
  onUpdate = update;
  if (!listenersBound) {
    listenersBound = true;
    window.addEventListener('resize', () => redraw());
    window.addEventListener('orientationchange', () => redraw());
    document.addEventListener('visibilitychange', () => onUpdate());
    motionQuery.addEventListener('change', () => onUpdate());
  }
  stopLoop?.(); // 前のループが残っていれば必ず止めてから新しいループに切り替える
  stopLoop = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  };
  update();
  fallbackActive = false;
  canvas.style.backgroundImage = '';
  canvas.classList.add('ready');
}

start().catch((e) => {
  console.error(e);
  showFallback();
});
