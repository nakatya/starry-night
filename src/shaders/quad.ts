export const VERTEX_SHADER = `
attribute vec2 aPos;
varying vec2 vUv; // 絵の全体が収まる範囲(contain)。0〜1 の外は背景
varying vec2 vBg; // 背景用に画面を覆う範囲(cover)
uniform vec4 uUvRect; // contain: u0, v0, u1, v1(左上原点)
uniform vec4 uBgRect; // cover: u0, v0, u1, v1(左上原点)
void main() {
  vec2 p = aPos * 0.5 + 0.5; // 0..1、左下原点
  vUv = vec2(mix(uUvRect.x, uUvRect.z, p.x), mix(uUvRect.w, uUvRect.y, p.y));
  vBg = vec2(mix(uBgRect.x, uBgRect.z, p.x), mix(uBgRect.w, uBgRect.y, p.y));
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

import { HALOS, PROFILE_PEAK, VORTICES } from '../logic/flow';
import { STARS } from '../logic/stars';

export const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
varying vec2 vBg;
uniform sampler2D uImage;
uniform sampler2D uMask;
uniform sampler2D uBlur; // 余白用に絵を小さく縮めたもの
uniform float uDebugMask; // 1 のときマスクを白黒で重ねる
uniform float uPhase; // 0..1(1周期で一周)
uniform float uAspect; // 絵の 幅 / 高さ
uniform vec4 uBand; // 帯の中心 v, 半幅, 強さ, 最大のずれ
uniform vec4 uVortex[${VORTICES.length}]; // 中心 xy, 半径, 向き付きの強さ
uniform vec4 uHalo[${HALOS.length}];
uniform vec4 uStar[${STARS.length}]; // 中心 xy, 光輪の半径, 明るさの倍率 - 1

const float PROFILE_PEAK = ${PROFILE_PEAK.toFixed(6)}; // s*(1-s^2)^2 の最大値

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

// 絵の外側の余白: 画面を覆うように拡大した絵を、ぼかして暗くして敷く。
// uBlur は絵を小さく縮めたテクスチャ。線形補間で引き伸ばすだけで、なめらかにぼける
vec3 background() {
  return texture2D(uBlur, vBg).rgb * 0.3;
}

void main() {
  if (vUv.x < 0.0 || vUv.x > 1.0 || vUv.y < 0.0 || vUv.y > 1.0) {
    gl_FragColor = vec4(background(), 1.0);
    return;
  }
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
  // 星と月の光輪: 中心ほど強く、半径の外では 0 の重みで明るさを増減する。白飛びさせない
  float glow = 0.0;
  for (int i = 0; i < ${STARS.length}; i++) {
    vec2 d = vec2(vUv.x - uStar[i].x, (vUv.y - uStar[i].y) / uAspect);
    float s2 = dot(d, d) / (uStar[i].z * uStar[i].z); // 正規化距離の二乗
    if (s2 >= 1.0) continue;
    float w = (1.0 - s2) * (1.0 - s2);
    glow += w * uStar[i].w;
  }
  c = min(c * (1.0 + glow * m), vec3(1.0)); // マスク 0 では明るさを変えない
  if (uDebugMask > 0.5) {
    c = mix(c, vec3(m), 0.85);
  }
  gl_FragColor = vec4(c, 1.0);
}
`;
