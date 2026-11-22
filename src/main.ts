import { coverUvRect } from './logic/cover';
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
import { buildMask } from './logic/mask';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders/quad';

const IMAGE_URL = `${import.meta.env.BASE_URL}starry-night.jpg`;
const MAX_DPR = 2;
const MASK_W = 768;
const MASK_H = 608;

const canvas = document.getElementById('stage') as HTMLCanvasElement;

function showFallback(): void {
  // WebGL が使えないときは CSS の背景画像(cover)で表示する
  canvas.style.backgroundImage = `url(${IMAGE_URL})`;
  canvas.classList.add('ready');
}

async function start(): Promise<void> {
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

  const image = await loadImage(IMAGE_URL);
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
  gl.activeTexture(gl.TEXTURE0);
  const params = new URLSearchParams(location.search);
  const speedParam = Number(params.get('speed') ?? 1);
  const speed = Number.isFinite(speedParam) && speedParam >= 0 ? speedParam : 1;
  const u = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform1f(u('uAspect'), IMAGE_ASPECT);
  gl.uniform4f(u('uBand'), BAND.centerV, BAND.halfWidth, BAND.strength, MAX_DISPLACEMENT);
  gl.uniform4fv(u('uVortex[0]'), packVortices(VORTICES));
  gl.uniform4fv(u('uHalo[0]'), packVortices(HALOS));
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

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let phase = 0;
  let last = 0;
  const frame = (now: number): void => {
    if (!document.hidden) {
      // 非表示から戻ったときに飛ばないよう、1フレームの進みに上限を設ける
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      phase = (phase + (dt * speed) / PERIOD_SECONDS) % 1;
      gl.uniform1f(phaseLoc, phase);
      draw(gl);
    }
    last = document.hidden ? 0 : now;
    requestAnimationFrame(frame);
  };
  gl.uniform1f(phaseLoc, 0);
  draw(gl);
  window.addEventListener('resize', () => draw(gl));
  window.addEventListener('orientationchange', () => draw(gl));
  if (!reduced) requestAnimationFrame(frame);
  canvas.classList.add('ready');
}

start().catch((e) => {
  console.error(e);
  showFallback();
});
