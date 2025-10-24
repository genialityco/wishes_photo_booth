// components/BlowParticlesOverlay.tsx
"use client";
import React, { useEffect, useRef } from "react";

type P = {
  intensity: number; // 0..1 basado en level del hook
  playing: boolean; // si está soplando
  width: number;
  height: number;
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number };

export default function BlowParticlesOverlay({
  intensity,
  playing,
  width,
  height,
}: P) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef<number | null>(null);
  const particles = useRef<Particle[]>([]);

  useEffect(() => {
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext("2d")!;
    let last = performance.now();

    const spawn = (n: number) => {
      for (let i = 0; i < n; i++) {
        const angle = Math.random() * Math.PI - Math.PI / 2; // abanico
        const speed = 0.6 + Math.random() * 1.4;
        particles.current.push({
          x: width / 2 + (Math.random() - 0.5) * (width * 0.3),
          y: height * 0.65 + Math.random() * (height * 0.05),
          vx: Math.cos(angle) * speed,
          vy: -Math.abs(Math.sin(angle) * speed) - (0.6 + Math.random() * 0.6),
          life: 900 + Math.random() * 600,
        });
      }
    };

    const loop = (t: number) => {
      raf.current = requestAnimationFrame(loop);
      const dt = Math.min(50, t - last);
      last = t;

      // spawn según intensidad
      if (playing) {
        const rate = Math.floor(4 + intensity * 28); // 4..32 por frame
        spawn(rate);
      }

      // clear con leve fade para streaks
      ctx.clearRect(0, 0, width, height);

      // update/draw
      const arr = particles.current;
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.x += p.vx * dt * 0.04;
        p.y += p.vy * dt * 0.04;
        p.vy += 0.002 * dt; // gravedad suave
        p.life -= dt;

        // dibujar chispa
        const lifeRatio = Math.max(0, Math.min(1, p.life / 1200));
        const r = 1 + lifeRatio * 2.5; // 1..3.5
        ctx.globalAlpha = 0.25 + 0.75 * lifeRatio;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();

        // glow simple
        ctx.globalAlpha = 0.12 * lifeRatio;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
        ctx.fill();

        if (
          p.life <= 0 ||
          p.x < -20 ||
          p.x > width + 20 ||
          p.y < -20 ||
          p.y > height + 20
        ) {
          arr.splice(i, 1);
        }
      }
      ctx.globalAlpha = 1;
    };

    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      particles.current = [];
    };
  }, [intensity, playing, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      aria-hidden
    />
  );
}
