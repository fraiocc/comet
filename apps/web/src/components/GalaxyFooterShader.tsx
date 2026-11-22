"use client";

import React, { useEffect, useRef } from "react";

export type GalaxyFooterShaderProps = {
  className?: string;
  children?: React.ReactNode;
  speed?: number;
};

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

varying vec2 v_uv;

uniform vec2 u_res;
uniform float u_time;

const mat2 R = mat2(0.80, 0.60, -0.60, 0.80);

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.31, 289.17))) * 26737.367);
}

vec2 hash2(vec2 p) {
  return vec2(
    fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453),
    fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453)
  );
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * vnoise(p);
    p = R * p * 2.05 + 17.31;
    amp *= 0.5;
  }
  return sum;
}

vec3 starField(vec2 p, float scale, float density, float t) {
  vec2 gv = p * scale;
  vec2 id = floor(gv);
  vec2 f = fract(gv) - 0.5;
  vec2 rnd = hash2(id);
  if (rnd.x < density) return vec3(0.0);

  vec2 offset = (rnd - 0.5) * 0.72;
  float d = length(f - offset);
  float core = smoothstep(0.065, 0.007, d);
  float twinkle = 0.6 + 0.4 * sin(t * (1.2 + rnd.y * 3.0) + rnd.x * 62.83);
  vec3 tint = mix(vec3(0.62, 0.77, 1.0), vec3(0.96, 0.99, 1.0), rnd.y);
  return tint * core * twinkle;
}

vec3 shootingStar(vec2 p, float aspect, float t, float period, float phase, float startY) {
  float cycle = fract(t / period + phase);
  float active = smoothstep(0.0, 0.03, cycle) * (1.0 - smoothstep(0.22, 0.30, cycle));
  if (active < 0.001) return vec3(0.0);

  float progress = cycle / 0.30;
  vec2 dir = normalize(vec2(-1.0, -0.48));
  vec2 startPos = vec2(aspect * (0.65 + phase * 0.45), startY);
  vec2 head = startPos + dir * (progress * 1.15);

  vec2 rel = p - head;
  float along = dot(rel, -dir);
  float perp = abs(dot(rel, vec2(-dir.y, dir.x)));

  float headGlow = exp(-length(rel) * 68.0) * 1.3;
  float tailLen = 0.28;
  float tailMask = smoothstep(0.0, 0.012, along) * (1.0 - smoothstep(0.0, tailLen, along));
  float width = mix(0.0035, 0.015, clamp(along / tailLen, 0.0, 1.0));
  float tail = exp(-(perp * perp) / (width * width)) * tailMask * (1.0 - along / tailLen);

  float frac = clamp(along / tailLen, 0.0, 1.0);
  vec3 col = mix(vec3(0.96, 0.99, 1.0), vec3(0.62, 0.77, 1.0), frac);
  return (vec3(0.96, 0.99, 1.0) * headGlow + col * tail * 0.9) * active;
}

vec3 renderPlanet(vec3 base, vec2 p, vec2 center, float radius) {
  vec2 q = p - center;
  float tilt = -0.34;
  float ct = cos(tilt);
  float st = sin(tilt);
  vec2 rq = vec2(q.x * ct - q.y * st, q.x * st + q.y * ct);

  float ringDist = length(vec2(rq.x, rq.y * 3.8));
  float ringBand = smoothstep(radius * 1.28, radius * 1.44, ringDist)
                 * (1.0 - smoothstep(radius * 1.85, radius * 2.15, ringDist));
  float ringPattern = 0.72 + 0.28 * sin(ringDist * 95.0);
  vec3 ringColor = vec3(0.54, 0.66, 0.98) * ringPattern;

  float d = length(q);
  vec3 col = base;

  if (rq.y > 0.0) {
    col = mix(col, ringColor, ringBand * 0.42);
  }

  if (d < radius) {
    float z = sqrt(max(0.0, radius * radius - d * d));
    vec3 normal = normalize(vec3(q.x, q.y, z));
    vec3 lightDir = normalize(vec3(0.65, 0.55, 0.52));
    float diff = max(dot(normal, lightDir), 0.0);
    float rim = pow(1.0 - max(normal.z, 0.0), 3.0);

    float bands = fbm(vec2(rq.y * 28.0 + 3.0, rq.x * 6.0));
    vec3 surfDark = vec3(0.05, 0.05, 0.09);
    vec3 surfLit = mix(vec3(0.22, 0.31, 0.58), vec3(0.45, 0.36, 0.72), bands);
    vec3 planetCol = mix(surfDark, surfLit, smoothstep(0.0, 0.85, diff));
    planetCol += vec3(0.62, 0.78, 1.0) * rim * (0.25 + diff * 0.55);

    float edge = smoothstep(radius, radius - 0.004, d);
    col = mix(col, planetCol, edge);
  }

  if (rq.y <= 0.0) {
    col = mix(col, ringColor, ringBand * 0.55);
  }

  return col;
}

vec3 renderBlackHole(vec3 base, vec2 p, vec2 center, float radius, float t) {
  vec2 q = p - center;
  float d = length(q);

  float tilt = 0.26;
  float ct = cos(tilt);
  float st = sin(tilt);
  vec2 rq = vec2(q.x * ct - q.y * st, q.x * st + q.y * ct);

  float diskR = length(vec2(rq.x, rq.y * 3.4));
  float angle = atan(rq.y * 3.4, rq.x);
  float swirl = fbm(vec2(diskR * 12.0 - t * 0.25, angle * 2.0 + t * 0.35));

  float diskBand = smoothstep(radius * 0.95, radius * 1.25, diskR)
                 * (1.0 - smoothstep(radius * 1.65, radius * 3.1, diskR));
  float doppler = 0.75 + 0.35 * cos(angle + 0.6);

  vec3 innerHot = vec3(0.95, 0.98, 1.0);
  vec3 midBlue = vec3(0.48, 0.68, 1.0);
  vec3 outerViolet = vec3(0.58, 0.36, 0.95);
  float radialT = clamp((diskR - radius) / (radius * 2.0), 0.0, 1.0);
  vec3 diskCol = mix(mix(innerHot, midBlue, smoothstep(0.0, 0.45, radialT)), outerViolet, smoothstep(0.4, 1.0, radialT));
  diskCol *= (0.65 + 0.65 * swirl) * doppler;

  float halo = exp(-abs(d - radius * 1.04) * 34.0) * 0.85;
  float outerGlow = exp(-d * 4.5) * 0.22;

  vec3 col = base + vec3(0.36, 0.48, 0.92) * outerGlow;

  if (rq.y > 0.0) {
    col += diskCol * diskBand * 0.85;
  }

  float horizon = smoothstep(radius * 1.02, radius * 0.92, d);
  col = mix(col, vec3(0.015, 0.015, 0.025), horizon);

  col += mix(vec3(0.75, 0.88, 1.0), vec3(0.62, 0.44, 1.0), 0.35) * halo;

  if (rq.y <= 0.0) {
    col += diskCol * diskBand * 0.95;
  }

  return col;
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(v_uv.x * aspect, v_uv.y);
  float t = u_time;

  vec3 col = mix(vec3(0.025, 0.025, 0.045), vec3(0.035, 0.035, 0.048), v_uv.y);

  vec2 galCoord = vec2((v_uv.x - 0.5) * aspect, v_uv.y - 0.45);
  float bandAxis = galCoord.y * 0.85 - galCoord.x * 0.28;
  float galaxyBand = exp(-bandAxis * bandAxis * 12.0);
  float neb1 = fbm(p * 2.6 + vec2(t * 0.01, -t * 0.008));
  float neb2 = fbm(p * 4.8 - vec2(t * 0.006, 2.3));

  vec3 nebulaCol = mix(vec3(0.11, 0.22, 0.52), vec3(0.36, 0.20, 0.62), neb2);
  col += nebulaCol * galaxyBand * smoothstep(0.32, 0.82, neb1) * 0.42;

  col += starField(p, 28.0, 0.86, t) * 0.85;
  col += starField(p + 19.4, 58.0, 0.90, t) * 0.55;
  col += starField(p + 41.2, 105.0, 0.94, t) * 0.32;

  col = renderPlanet(col, p, vec2(aspect * 0.16, 0.44), 0.115);
  col = renderBlackHole(col, p, vec2(aspect * 0.80, 0.46), 0.125, t);

  col += shootingStar(p, aspect, t, 9.5, 0.12, 0.86);
  col += shootingStar(p, aspect, t, 14.0, 0.58, 0.74);

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
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

export function GalaxyFooterShader({
  className,
  children,
  speed = 1,
}: GalaxyFooterShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef(speed);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
    });
    if (!gl) return;

    const vert = compile(gl, gl.VERTEX_SHADER, VERT);
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vert || !frag) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.bindAttribLocation(program, 0, "a_pos");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const resLoc = gl.getUniformLocation(program, "u_res");
    const timeLoc = gl.getUniformLocation(program, "u_time");

    let frame = 0;
    let running = true;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(resLoc, w, h);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const start = performance.now();
    const draw = (now: number) => {
      if (!running) return;
      const elapsed = reduceMotion ? 0 : ((now - start) / 1000) * speedRef.current;
      gl.uniform1f(timeLoc, elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    };
  }, []);

  return (
    <div className={["relative w-full overflow-hidden", className ?? ""].join(" ")}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[var(--bg)] via-[var(--bg)]/70 to-transparent" />
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
