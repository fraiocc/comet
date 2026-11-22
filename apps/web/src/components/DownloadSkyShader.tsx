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
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.04;
    a *= 0.5;
  }
  return v;
}

float starLayer(vec2 p, float scale, float density, float t) {
  vec2 gv = p * scale;
  vec2 id = floor(gv);
  vec2 f = fract(gv) - 0.5;
  vec2 rnd = hash2(id);
  if (rnd.x < density) return 0.0;
  float d = length(f - (rnd - 0.5) * 0.72);
  float core = smoothstep(0.055, 0.006, d);
  float halo = exp(-d * 18.0) * 0.25;
  float twinkle = 0.62 + 0.38 * sin(t * (0.9 + rnd.y * 2.1) + rnd.x * 62.83);
  return (core + halo) * twinkle;
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2((v_uv.x - 0.5) * aspect, v_uv.y);
  float t = u_time;

  vec3 base = vec3(0.035, 0.035, 0.047);
  vec3 col = base;

  vec2 q = vec2(
    fbm(vec2(p.x * 1.15 + t * 0.045, p.y * 1.4 - t * 0.025)),
    fbm(vec2(p.x * 1.35 - t * 0.035 + 4.2, p.y * 1.2 + t * 0.02 + 1.7))
  );
  float veil = fbm(vec2(p.x * 1.6 + q.x * 1.4, p.y * 2.0 + q.y * 1.1));

  float ribbonCurve = 0.56 + 0.14 * sin(p.x * 1.55 + t * 0.18) + (q.x - 0.5) * 0.26;
  float distToRibbon = abs(p.y - ribbonCurve);
  float ribbon = exp(-distToRibbon * 5.2) * (0.55 + 0.75 * veil);

  float secondaryCurve = 0.72 + 0.10 * cos(p.x * 1.2 - t * 0.14) + (q.y - 0.5) * 0.22;
  float secondary = exp(-abs(p.y - secondaryCurve) * 4.0) * veil;

  float centerFocus = exp(-pow(p.x * 0.85, 2.0));
  vec3 cobalt = vec3(0.10, 0.42, 1.0);
  vec3 cyan = vec3(0.54, 0.78, 1.0);
  vec3 indigo = vec3(0.38, 0.28, 0.92);

  col += cobalt * ribbon * (0.48 + 0.35 * centerFocus);
  col += cyan * pow(ribbon, 2.2) * 0.42 * centerFocus;
  col += indigo * secondary * 0.32;

  float zenithGlow = exp(-length((p - vec2(0.0, 0.95)) * vec2(0.75, 1.35)) * 2.2);
  col += vec3(0.08, 0.24, 0.62) * zenithGlow * 0.45;

  vec2 starUv = vec2(v_uv.x * aspect, v_uv.y);
  float s1 = starLayer(starUv, 24.0, 0.90, t) * 0.75;
  float s2 = starLayer(starUv + vec2(11.3, 5.7), 44.0, 0.94, t * 0.8) * 0.45;
  col += vec3(0.80, 0.89, 1.0) * (s1 + s2);

  float bottomFade = smoothstep(0.0, 0.38, v_uv.y);
  col = mix(base, col, bottomFade);

  gl_FragColor = vec4(col, 1.0);
}
`;

interface DownloadSkyShaderProps {
  children: ReactNode;
  className?: string;
}

export function DownloadSkyShader({ children, className = "" }: DownloadSkyShaderProps) {
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
      <div className="relative z-10">{children}</div>
    </div>
  );
}
