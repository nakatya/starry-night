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

import { HALOS, VORTICES } from '../logic/flow';

export const FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform sampler2D uMask;
uniform float uDebugMask; // 1 のときマスクを白黒で重ねる
uniform float uPhase; // 0..1(1周期で一周)
uniform float uAspect; // 絵の 幅 / 高さ
uniform vec4 uBand; // 帯の中心 v, 半幅, 強さ, 最大のずれ
uniform vec4 uVortex[${VORTICES.length}]; // 中心 xy, 半径, 向き付きの強さ
uniform vec4 uHalo[${HALOS.length}];

const float PROFILE_PEAK = 0.2862; // s*(1-s^2)^2 の最大値

vec2 vortexFlow(vec2 uv, vec4 vx) {
  vec2 d = vec2(uv.x - vx.x, (uv.y - vx.y) / uAspect);
  float r = length(d);
  if (r >= vx.z || r < 1e-6) return vec2(0.0);
  float s = r / vx.z;
  float k = (1.0 - s * s) * (1.0 - s * s);
  float speed = vx.w * s * k / PROFILE_PEAK;
  return vec2(-d.y, d.x) / r * speed;
}

// src/logic/flow.ts の flow() と同じ。幅を 1 とした長さ
vec2 flowAt(vec2 uv) {
  float t = (uv.y - uBand.x) / uBand.y;
  vec2 f = vec2(uBand.z * exp(-t * t), 0.0);
  for (int i = 0; i < ${VORTICES.length}; i++) f += vortexFlow(uv, uVortex[i]);
  for (int i = 0; i < ${HALOS.length}; i++) f += vortexFlow(uv, uHalo[i]);
  float len = length(f);
  if (len > uBand.w) f *= uBand.w / len;
  return f;
}

void main() {
  float m = texture2D(uMask, vUv).r;
  vec2 f = flowAt(vUv) * m; // マスク 0 では動かさない
  f.y *= uAspect; // UV へ
  // 2つの位相を半周期ずらし、三角形の重みで混ぜる
  float p0 = fract(uPhase);
  float p1 = fract(uPhase + 0.5);
  float w0 = 1.0 - abs(2.0 * p0 - 1.0);
  vec3 c0 = texture2D(uImage, vUv - f * (p0 - 0.5) * 2.0).rgb;
  vec3 c1 = texture2D(uImage, vUv - f * (p1 - 0.5) * 2.0).rgb;
  vec3 c = mix(c1, c0, w0);
  if (uDebugMask > 0.5) {
    c = mix(c, vec3(m), 0.85);
  }
  gl_FragColor = vec4(c, 1.0);
}
`;
