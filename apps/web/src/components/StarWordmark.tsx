"use client";

import { useEffect, useRef } from "react";

interface StarParticle {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  twinkleSpeed: number;
  color: string;
}

const PALETTE = ["#f4fcff", "#cdeaff", "#9cc4ff", "#8296ff", "#a070ff"];

export function StarWordmark({ text = "comet" }: { text?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: StarParticle[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let running = true;

    const pointer = { x: -9999, y: -9999, active: false };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function buildParticles() {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      const off = document.createElement("canvas");
      off.width = width;
      off.height = height;
      const offCtx = off.getContext("2d");
      if (!offCtx) return;

      const fontSize = Math.min(width * 0.27, height * 0.86, 220);
      offCtx.clearRect(0, 0, width, height);
      offCtx.fillStyle = "#ffffff";
      offCtx.textAlign = "center";
      offCtx.textBaseline = "middle";
      offCtx.font = `700 ${fontSize}px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif`;
      offCtx.fillText(text, width / 2, height * 0.54);

      const image = offCtx.getImageData(0, 0, width, height).data;
      const gap = width < 520 ? 4 : 5;
      const next: StarParticle[] = [];

      for (let y = 0; y < height; y += gap) {
        for (let x = 0; x < width; x += gap) {
          const alpha = image[(y * width + x) * 4 + 3];
          if (alpha < 130) continue;

          const jitterX = (Math.random() - 0.5) * 2.2;
          const jitterY = (Math.random() - 0.5) * 2.2;
          const homeX = x + jitterX;
          const homeY = y + jitterY;
          const t = Math.min(1, Math.max(0, x / width));
          const paletteIdx = Math.min(
            PALETTE.length - 1,
            Math.floor(t * PALETTE.length + (Math.random() - 0.5) * 0.8),
          );

          next.push({
            x: homeX,
            y: homeY,
            homeX,
            homeY,
            vx: 0,
            vy: 0,
            size: 1.0 + Math.random() * 1.45,
            phase: Math.random() * Math.PI * 2,
            twinkleSpeed: 1.2 + Math.random() * 2.4,
            color: PALETTE[Math.max(0, paletteIdx)],
          });
        }
      }

      particles = next;
    }

    function handlePointerMove(e: PointerEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    }

    function handlePointerLeave() {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    }

    function handleClick(e: MouseEvent) {
      if (!canvas || reduceMotion) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      for (const p of particles) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 220) {
          const impulse = ((220 - dist) / 220) * 14;
          p.vx += (dx / dist) * impulse;
          p.vy += (dy / dist) * impulse;
        }
      }
    }

    const observer = new ResizeObserver(buildParticles);
    observer.observe(canvas);
    buildParticles();

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("click", handleClick);

    const start = performance.now();

    function draw(now: number) {
      if (!running || !ctx) return;
      const elapsed = (now - start) / 1000;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const interactRadius = 86;
      const activeStars: StarParticle[] = [];

      for (const p of particles) {
        if (!reduceMotion) {
          if (pointer.active) {
            const dx = p.x - pointer.x;
            const dy = p.y - pointer.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < interactRadius * interactRadius && distSq > 0.01) {
              const dist = Math.sqrt(distSq);
              const force = (interactRadius - dist) / interactRadius;
              p.vx += (dx / dist) * force * 2.4;
              p.vy += (dy / dist) * force * 2.4;
              activeStars.push(p);
            }
          }

          const springX = (p.homeX - p.x) * 0.065;
          const springY = (p.homeY - p.y) * 0.065;
          p.vx = (p.vx + springX) * 0.86;
          p.vy = (p.vy + springY) * 0.86;
          p.x += p.vx;
          p.y += p.vy;
        }

        const speed = Math.hypot(p.vx, p.vy);
        const twinkle = reduceMotion
          ? 0.85
          : 0.55 + 0.45 * Math.sin(elapsed * p.twinkleSpeed + p.phase);
        const boost = Math.min(0.45, speed * 0.08);
        const alpha = Math.min(1, twinkle + boost);
        const r = p.size + Math.min(1.1, speed * 0.12);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = speed > 1.8 ? "#f4fcff" : p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduceMotion && activeStars.length > 1) {
        ctx.lineWidth = 0.6;
        const limit = Math.min(activeStars.length, 42);
        for (let i = 0; i < limit; i++) {
          const a = activeStars[i];
          for (let j = i + 1; j < limit; j++) {
            const b = activeStars[j];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist < 28) {
              ctx.globalAlpha = (1 - dist / 28) * 0.28;
              ctx.strokeStyle = "#9cc4ff";
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("click", handleClick);
    };
  }, [text]);

  return (
    <div className="relative mx-auto mt-6 w-full max-w-5xl select-none">
      <canvas
        ref={canvasRef}
        aria-label={text}
        className="block h-36 w-full cursor-crosshair sm:h-48 md:h-56"
      />
    </div>
  );
}
