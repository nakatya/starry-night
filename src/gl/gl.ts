export type GL = WebGLRenderingContext | WebGL2RenderingContext;

/** WebGL2 → WebGL1 の順で取得する。使えなければ null */
export function createContext(canvas: HTMLCanvasElement): GL | null {
  try {
    return (
      canvas.getContext('webgl2', { antialias: false }) ||
      canvas.getContext('webgl', { antialias: false })
    );
  } catch {
    return null;
  }
}

export function compileShader(gl: GL, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('シェーダーのコンパイルに失敗:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createProgram(gl: GL, vertexSrc: string, fragmentSrc: string): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  // リンク後はシェーダーオブジェクト自体は不要(プログラムが削除されるまで内部で保持される)
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('プログラムのリンクに失敗:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/** 全画面の四角形(三角形ストリップ)を作り、attribute に結びつける */
export function createFullscreenQuad(gl: GL, program: WebGLProgram, attribName: string): void {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, attribName);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
}

export interface LoadedTexture {
  texture: WebGLTexture;
  width: number;
  height: number;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`画像の読み込みに失敗: ${url}`));
    img.src = url;
  });
}

export function createTexture(gl: GL, image: HTMLImageElement): LoadedTexture {
  const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  if (image.naturalWidth > max || image.naturalHeight > max) {
    throw new Error(
      `画像(${image.naturalWidth}×${image.naturalHeight})が MAX_TEXTURE_SIZE(${max})を超えています`,
    );
  }
  const texture = gl.createTexture();
  if (!texture) throw new Error('テクスチャを作れません');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return { texture, width: image.naturalWidth, height: image.naturalHeight };
}

/** 1 チャンネルのマスク(0〜255)をテクスチャにする */
export function createMaskTexture(gl: GL, data: Uint8Array, width: number, height: number): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error('テクスチャを作れません');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}
