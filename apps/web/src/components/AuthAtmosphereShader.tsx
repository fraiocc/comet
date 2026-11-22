"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

const VERTEX_SHADER = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

varying vec2 v_uv;

uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.31, 289.17))) * 26737.367);
}

vec2 hash2(vec2 p) {
  return vec2(
    fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453),
    fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453)
  );
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p = rot * p * 2.02;
    a *= 0.5;
  }
  return v;
}

float starField(vec2 p, float scale, float density, float t) {
  vec2 gv = p * scale;
  vec2 id = floor(gv);
  vec2 f = fract(gv) - 0.5;
  vec2 rnd = hash2(id);
  if (rnd.x < density) return 0.0;
  float d = length(f - (rnd - 0.5) * 0.72);
  float core = smoothstep(0.05, 0.005, d);
  float glow = exp(-d * 16.0) * 0.22;
  float twinkle = 0.65 + 0.35 * sin(t * (0.8 + rnd.y * 1.8) + rnd.x * 62.83);
  return (core + glow) * twinkle;
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 uv = v_uv;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  float t = u_time;

  vec3 col = mix(vec3(0.028, 0.030, 0.048), vec3(0.042, 0.045, 0.075), uv.y);

  vec2 q = vec2(
    fbm(p * 1.35 + vec2(t * 0.032, -t * 0.022)),
    fbm(p * 1.45 + vec2(-t * 0.025 + 3.4, t * 0.018 + 1.9))
  );
  vec2 r = vec2(
    fbm(p * 1.9 + 1.6 * q + vec2(1.7, 9.2) + t * 0.02),
    fbm(p * 1.8 + 1.5 * q + vec2(8.3, 2.8) - t * 0.018)
  );
  float mist = fbm(p * 1.6 + r * 1.4);

  vec2 focusA = vec2(-0.18 + sin(t * 0.12) * 0.08, 0.14 + cos(t * 0.10) * 0.06);
  vec2 focusB = vec2(0.26 + cos(t * 0.09) * 0.08, -0.18 + sin(t * 0.11) * 0.06);
  float glowA = exp(-length((p - focusA) * vec2(1.0, 1.15)) * 2.1);
  float glowB = exp(-length((p - focusB) * vec2(0.95, 1.1)) * 2.2);

  vec3 deepCobalt = vec3(0.09, 0.36, 0.96);
  vec3 softCyan = vec3(0.58, 0.80, 1.0);
  vec3 softViolet = vec3(0.46, 0.32, 0.92);

  col += deepCobalt * (mist * 0.55 + glowA * 0.65) * 0.72;
  col += softViolet * (r.y * 0.48 + glowB * 0.55) * 0.52;
  col += softCyan * pow(clamp(mist * glowA * 1.75, 0.0, 1.0), 1.8) * 0.85;

  float haloDist = length(p - vec2(0.02, 0.06));
  float softOrb = exp(-abs(haloDist - 0.34) * 14.0) * (0.45 + 0.55 * r.x);
  col += vec3(0.62, 0.82, 1.0) * softOrb * 0.24;

  vec2 starUv = vec2(uv.x * aspect, uv.y);
  float s1 = starField(starUv, 22.0, 0.90, t) * 0.8;
  float s2 = starField(starUv + vec2(7.1, 13.4), 42.0, 0.94, t * 0.75) * 0.45;
  col += vec3(0.84, 0.91, 1.0) * (s1 + s2);

  float vignette = smoothstep(1.25, 0.28, length(p));
  col *= 0.72 + 0.28 * vignette;

  float grain = (hash(gl_FragCoord.xy + fract(t) * 100.0) - 0.5) * 0.014;
  col += grain;

  gl_FragColor = vec4(col, 1.0);
}
`;

interface AuthAtmosphereShaderProps {
  children?: ReactNode;
  className?: string;
}

export function AuthAtmosphereShader({ children, className = "" }: AuthAtmosphereShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return;

    function compile(type: number, source: string) {
      if (!gl) return null;
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const posLoc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const resLoc = gl.getUniformLocation(program, "u_res");
    const timeLoc = gl.getUniformLocation(program, "u_time");

    let rafId = 0;
    const start = performance.now();

    function resize() {
      if (!canvas || !gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    function render() {
      if (!canvas || !gl) return;
      resize();
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafId = requestAnimationFrame(render);
    }

    render();
    return () => {
      cancelAnimationFrame(rafId);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
