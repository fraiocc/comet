"use client";

import React, { useEffect, useRef } from "react";

export type CometSkyShaderProps = {
  className?: string;
  children?: React.ReactNode;
  speed?: number;
  count?: number;
  cloudColor?: string;
  skyTopColor?: string;
  skyBottomColor?: string;
  fadeBottom?: boolean;
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
uniform float u_count;
uniform vec3 u_cloud;
uniform vec3 u_skyTop;
uniform vec3 u_skyBottom;

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
  for (int i = 0; i < 4; i++) {
    sum += amp * vnoise(p);
    p = R * p * 2.03 + 19.19;
    amp *= 0.5;
  }
  return sum;
}

float billow(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * (1.0 - abs(2.0 * vnoise(p) - 1.0));
    p = R * p * 2.11 + 13.37;
    amp *= 0.5;
  }
  return sum;
}

vec3 starLayer(vec2 p, float scale, float density, float t) {
  vec2 gv = p * scale;
  vec2 id = floor(gv);
  vec2 f = fract(gv) - 0.5;
  vec2 rnd = hash2(id);

  if (rnd.x < density) return vec3(0.0);

  vec2 offset = (rnd - 0.5) * 0.72;
  float d = length(f - offset);
  float core = smoothstep(0.07, 0.008, d);
  float twinkle = 0.65 + 0.35 * sin(t * (1.4 + rnd.y * 2.8) + rnd.x * 62.83);

  vec3 starCol = mix(vec3(0.61, 0.77, 1.0), vec3(0.96, 0.99, 1.0), rnd.y);
  return starCol * core * twinkle;
}

vec3 cometPass(vec2 p, float aspect, float t, float period, float phase, float startY, float scale) {
  float cycle = fract(t / period + phase);
  float active = smoothstep(0.0, 0.04, cycle) * (1.0 - smoothstep(0.28, 0.38, cycle));
  if (active < 0.001) return vec3(0.0);

  float progress = cycle / 0.38;
  vec2 dir = normalize(vec2(-1.0, -0.62));
  vec2 startPos = vec2(aspect * (0.72 + phase * 0.45), startY);
  vec2 head = startPos + dir * (progress * 1.15 * scale);

  vec2 rel = p - head;
  float along = dot(rel, -dir);
  float perp = abs(dot(rel, vec2(-dir.y, dir.x)));

  float headGlow = exp(-length(rel) * 58.0) * 1.4;
  float tailLen = 0.34 * scale;
  float tailMask = smoothstep(0.0, 0.015, along) * (1.0 - smoothstep(0.0, tailLen, along));
  float width = mix(0.0055, 0.022, clamp(along / tailLen, 0.0, 1.0));
  float tail = exp(-(perp * perp) / (width * width)) * tailMask * (1.0 - along / tailLen);

  float frac = clamp(along / tailLen, 0.0, 1.0);
  vec3 cHead = vec3(0.957, 0.988, 1.0);
  vec3 cMid = vec3(0.612, 0.769, 1.0);
  vec3 cTail = vec3(0.627, 0.439, 1.0);
  vec3 tailColor = mix(mix(cHead, cMid, smoothstep(0.0, 0.45, frac)), cTail, smoothstep(0.45, 1.0, frac));

  return (cHead * headGlow + tailColor * tail * 0.95) * active;
}

float cloudDensity(vec2 p, vec2 c, vec2 r, float seed, float t) {
  vec2 q = p - c;

  float ry = q.y > 0.0 ? r.y : r.y * 0.42;
  float env = 1.0 - length(vec2(q.x / r.x, q.y / ry));
  if (env < -0.35) return 0.0;

  vec2 dp = q * (2.4 / r.x) + seed;
  dp += 0.6 * vec2(
    fbm(dp * 1.4 + t * 0.04),
    fbm(dp * 1.4 + 7.7 - t * 0.03)
  );
  float detail = billow(dp * 1.6);

  return env + (detail - 0.62) * 0.62;
}

vec3 shadeCloud(vec3 color, vec3 sky, vec2 p, vec2 c, vec2 r, float seed, float t, float dist) {
  float d = cloudDensity(p, c, r, seed, t);
  if (d < 0.02) return color;

  float dUp = cloudDensity(p + vec2(0.0, r.y * 0.55), c, r, seed, t);
  float occl = clamp((dUp - d) * 1.1 + d * 0.55, 0.0, 1.0);

  vec3 lit = u_cloud * 1.18;
  vec3 shadow = mix(u_cloud * 0.45, sky, 0.52);
  vec3 cloudCol = mix(lit, shadow, occl * 0.85);

  float alpha = smoothstep(0.02, 0.38, d);

  float rim = smoothstep(0.02, 0.14, d) * (1.0 - smoothstep(0.14, 0.40, d));
  cloudCol += vec3(0.55, 0.68, 1.0) * rim * 0.14;

  cloudCol = mix(cloudCol, sky, dist * 0.42);
  alpha *= mix(0.92, 0.65, dist);

  return mix(color, cloudCol, alpha);
}

vec3 cloudPass(vec3 color, vec3 sky, vec2 p, float aspect, float t,
               float spd, float phase, float y, vec2 r, float seed, float dist) {
  float cx = mix(-r.x - 0.25, aspect + r.x + 0.25, fract(t * spd + phase));
  float cy = y + sin(t * 0.05 + phase * 6.2831) * 0.012;
  return shadeCloud(color, sky, p, vec2(cx, cy), r, seed, t, dist);
}

void main() {
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(v_uv.x * aspect, v_uv.y);
  float t = u_time;

  vec3 sky = mix(u_skyBottom, u_skyTop, v_uv.y);
  vec3 color = sky;

  vec2 moonPos = vec2(aspect * 0.78, 0.86);
  float moonDist = length(p - moonPos);
  color += vec3(0.52, 0.62, 1.0) * exp(-moonDist * moonDist * 3.8) * 0.18;
  color += vec3(0.62, 0.44, 1.0) * exp(-moonDist * moonDist * 1.6) * 0.09;

  float starFade = smoothstep(0.15, 0.65, v_uv.y);
  color += starLayer(p, 26.0, 0.90, t) * starFade * 0.85;
  color += starLayer(p + 13.7, 52.0, 0.93, t) * starFade * 0.55;

  color += cometPass(p, aspect, t, 11.0, 0.15, 0.90, 1.0);
  color += cometPass(p, aspect, t, 17.0, 0.62, 0.76, 0.8);

  float cirrusBand = smoothstep(0.52, 0.78, v_uv.y) * (1.0 - smoothstep(0.92, 1.0, v_uv.y));
  if (cirrusBand > 0.01) {
    float streak = fbm(vec2(p.x * 1.5 - t * 0.005, p.y * 11.0));
    float wisp = smoothstep(0.55, 0.80, streak) * cirrusBand;
    color = mix(color, u_cloud * 1.15, wisp * 0.25);
  }

  if (u_count > 5.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.005, 0.10, 0.78, vec2(0.22, 0.10), 43.7, 1.0);
  }
  if (u_count > 4.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.007, 0.62, 0.64, vec2(0.26, 0.11), 71.3, 0.85);
  }
  if (u_count > 3.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.009, 0.33, 0.50, vec2(0.35, 0.15), 17.3, 0.55);
  }
  if (u_count > 2.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.011, 0.80, 0.38, vec2(0.32, 0.14), 29.9, 0.45);
  }
  if (u_count > 1.5) {
    color = cloudPass(color, sky, p, aspect, t, 0.014, 0.05, 0.24, vec2(0.48, 0.18), 91.1, 0.18);
  }
  color = cloudPass(color, sky, p, aspect, t, 0.017, 0.48, 0.12, vec2(0.58, 0.22), 57.2, 0.0);

  gl_FragColor = vec4(color, 1.0);
}
`;

function parseHex(color: string): [number, number, number] {
  const value = color.trim();
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16) / 255,
        parseInt(hex[1] + hex[1], 16) / 255,
        parseInt(hex[2] + hex[2], 16) / 255,
      ];
    }
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
    ];
  }
  const rgb = value.match(/[\d.]+/g);
  if (rgb && rgb.length >= 3) {
    return [Number(rgb[0]) / 255, Number(rgb[1]) / 255, Number(rgb[2]) / 255];
  }
  return [0.18, 0.17, 0.28];
}

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

export function CometSkyShader({
  className,
  children,
  speed = 0.85,
  count = 5,
  cloudColor = "#27253d",
  skyTopColor = "#07070d",
  skyBottomColor = "#141322",
  fadeBottom = true,
}: CometSkyShaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paramsRef = useRef({
    speed,
    count,
    cloudColor,
    skyTopColor,
    skyBottomColor,
  });

  useEffect(() => {
    paramsRef.current = {
      speed,
      count,
      cloudColor,
      skyTopColor,
      skyBottomColor,
    };
  }, [speed, count, cloudColor, skyTopColor, skyBottomColor]);

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

    const loc = {
      res: gl.getUniformLocation(program, "u_res"),
      time: gl.getUniformLocation(program, "u_time"),
      count: gl.getUniformLocation(program, "u_count"),
      cloud: gl.getUniformLocation(program, "u_cloud"),
      skyTop: gl.getUniformLocation(program, "u_skyTop"),
      skyBottom: gl.getUniformLocation(program, "u_skyBottom"),
    };

    let frame = 0;
    let running = true;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const w = Math.max(1, Math.floor(width * dpr));
      const h = Math.max(1, Math.floor(height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(loc.res, w, h);
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
        const p = paramsRef.current;
        const elapsed = reduceMotion ? 0 : ((now - start) / 1000) * p.speed;
        const cloud = parseHex(p.cloudColor);
        const skyTop = parseHex(p.skyTopColor);
        const skyBottom = parseHex(p.skyBottomColor);

        gl.uniform1f(loc.time, elapsed);
        gl.uniform1f(loc.count, Math.min(6, Math.max(1, p.count)));
        gl.uniform3f(loc.cloud, cloud[0], cloud[1], cloud[2]);
        gl.uniform3f(loc.skyTop, skyTop[0], skyTop[1], skyTop[2]);
        gl.uniform3f(loc.skyBottom, skyBottom[0], skyBottom[1], skyBottom[2]);
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
      {fadeBottom && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/70 to-transparent" />
      )}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
