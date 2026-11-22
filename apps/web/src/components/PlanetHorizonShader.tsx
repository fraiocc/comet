"use client";

import React, { useEffect, useRef } from "react";

export type PlanetHorizonShaderProps = {
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

float stars(vec2 p, float scale, float density, float t) {
  vec2 gv = p * scale;
  vec2 id = floor(gv);
  vec2 f = fract(gv) - 0.5;
  vec2 rnd = hash2(id);
  if (rnd.x < density) return 0.0;
  float d = length(f - (rnd - 0.5) * 0.7);
  float core = smoothstep(0.06, 0.008, d);
  float twinkle = 0.65 + 0.35 * sin(t * (1.0 + rnd.y * 2.2) + rnd.x * 62.83);
  return core * twinkle;
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2((v_uv.x - 0.5) * aspect, v_uv.y);
  float t = u_time;

  vec3 col = mix(vec3(0.038, 0.038, 0.056), vec3(0.030, 0.030, 0.045), v_uv.y);

  float radius = 2.65;
  vec2 planetCenter = vec2(0.0, -radius + 0.19);
  float d = length(p - planetCenter) - radius;

  float lightShift = sin(t * 0.35) * 0.22;
  float sunFocus = exp(-pow((p.x - lightShift) * 0.95, 2.0));

  float upperMask = smoothstep(-0.02, 0.25, d);
  float s = stars(vec2(v_uv.x * aspect, v_uv.y), 26.0, 0.91, t) * upperMask * 0.65;
  col += vec3(0.78, 0.88, 1.0) * s;

  if (d > 0.0) {
    float rim = exp(-d * 42.0) * (0.65 + 0.55 * sunFocus);
    float innerAtmo = exp(-d * 11.0) * (0.45 + 0.55 * sunFocus);
    float outerAtmo = exp(-d * 4.2) * (0.28 + 0.45 * sunFocus);
    float shimmer = 0.90 + 0.10 * noise(vec2(p.x * 5.0 - t * 0.18, d * 12.0));

    vec3 rimCol = vec3(0.95, 0.98, 1.0);
    vec3 midCol = vec3(0.14, 0.45, 1.0);
    vec3 outerCol = vec3(0.55, 0.42, 0.98);

    col += rimCol * rim * 0.95 * shimmer;
    col += midCol * innerAtmo * 0.62 * shimmer;
    col += outerCol * outerAtmo * 0.34;
  } else {
    float limbShadow = exp(d * 28.0) * (0.45 + 0.55 * sunFocus);
    vec3 darkPlanet = vec3(0.024, 0.024, 0.036);
    col = mix(darkPlanet, vec3(0.18, 0.36, 0.78), limbShadow * 0.55);
  }

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

export function PlanetHorizonShader({
  className,
  children,
  speed = 0.8,
}: PlanetHorizonShaderProps) {
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

    let visible = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? true;
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const start = performance.now();
    const draw = (now: number) => {
      if (!running) return;
      if (visible && !document.hidden) {
        const elapsed = reduceMotion ? 0 : ((now - start) / 1000) * speedRef.current;
        gl.uniform1f(timeLoc, elapsed);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      io.disconnect();
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
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
