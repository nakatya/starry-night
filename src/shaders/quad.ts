export const VERTEX_SHADER = `
attribute vec2 aPos;
varying vec2 vUv;
uniform vec4 uUvRect; // u0, v0, u1, v1(左上原点)
void main() {
  vec2 p = aPos * 0.5 + 0.5; // 0..1、左下原点
  vUv = vec2(mix(uUvRect.x, uUvRect.z, p.x), mix(uUvRect.w, uUvRect.y, p.y));
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform sampler2D uMask;
uniform float uDebugMask; // 1 のときマスクを白黒で重ねる
void main() {
  vec3 c = texture2D(uImage, vUv).rgb;
  if (uDebugMask > 0.5) {
    float m = texture2D(uMask, vUv).r;
    c = mix(c, vec3(m), 0.85);
  }
  gl_FragColor = vec4(c, 1.0);
}
`;
