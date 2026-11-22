import { coverUvRect } from './logic/cover';
import {
  createContext,
  createFullscreenQuad,
  createProgram,
  createTexture,
  loadImage,
  type GL,
} from './gl/gl';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders/quad';

const IMAGE_URL = `${import.meta.env.BASE_URL}starry-night.jpg`;
const MAX_DPR = 2;

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

  draw(gl);
  window.addEventListener('resize', () => draw(gl));
  window.addEventListener('orientationchange', () => draw(gl));
  canvas.classList.add('ready');
}

start().catch((e) => {
  console.error(e);
  showFallback();
});
