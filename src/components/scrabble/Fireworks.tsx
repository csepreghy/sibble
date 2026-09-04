import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
}

interface FireworksProps {
  /** increment this to launch a new celebration */
  trigger: number;
}

export function Fireworks({ trigger }: FireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!trigger) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const particles: Particle[] = [];
    const bursts = [
      { x: width * 0.25, y: height * 0.32, delay: 0 },
      { x: width * 0.72, y: height * 0.24, delay: 260 },
      { x: width * 0.5, y: height * 0.45, delay: 520 },
    ];

    const start = performance.now();
    let launched = 0;
    let raf = 0;

    function burst(x: number, y: number) {
      const hue = Math.floor(Math.random() * 360);
      const count = 46;
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = 1.6 + Math.random() * 3.2;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          hue: hue + Math.random() * 40,
        });
      }
    }

    function frame(now: number) {
      const elapsed = now - start;
      while (launched < bursts.length && elapsed >= bursts[launched]!.delay) {
        burst(bursts[launched]!.x, bursts[launched]!.y);
        launched += 1;
      }

      ctx!.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.045;
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.life -= 0.012;
        if (p.life <= 0) continue;
        ctx!.globalAlpha = Math.max(p.life, 0);
        ctx!.fillStyle = `hsl(${p.hue} 95% 62%)`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      const alive = particles.some((p) => p.life > 0);
      if (launched < bursts.length || alive) {
        raf = requestAnimationFrame(frame);
      } else {
        ctx!.clearRect(0, 0, width, height);
      }
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
