"use client";
import { useEffect, useRef } from "react";

// 夜间背景：星点闪烁 + 偶发流星（canvas 单循环）
type Star = { x: number; y: number; r: number; phase: number; speed: number; base: number; big: boolean };
type Shot = { x: number; y: number; vx: number; vy: number; life: number; max: number };

export default function TwinkleStars({ active = true }: { active?: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, dpr = 1, raf = 0, t = 0, last = 0, wasActive = activeRef.current;
    let stars: Star[] = [];
    let shot: Shot | null = null;
    let nextShot = 4;
    let sprite: HTMLCanvasElement | null = null;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const makeSprite = () => {
      const s = document.createElement("canvas");
      s.width = 64; s.height = 64;
      const c = s.getContext("2d");
      if (!c) return s;
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      g.addColorStop(0.18, "rgba(214, 230, 255, 0.55)");
      g.addColorStop(0.5, "rgba(170, 200, 255, 0.16)");
      g.addColorStop(1, "rgba(140, 180, 255, 0)");
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
      return s;
    };

    const newStar = (big: boolean): Star => ({
      x: rand(0, w || 1),
      y: rand(0, h || 1),
      r: big ? rand(1.5, 2.3) : rand(0.4, 1.4),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.6, 2.4),
      base: big ? rand(0.75, 1) : rand(0.35, 0.85),
      big,
    });

    const drawStar = (s: Star) => {
      const tw = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
      const a = s.base * (0.3 + 0.7 * tw);
      if (s.big && sprite) {
        const rr = s.r * (10 + 6 * tw);
        ctx.globalAlpha = a;
        ctx.drawImage(sprite, s.x - rr / 2, s.y - rr / 2, rr, rr);
        const len = s.r * 3.5 * (0.5 + 0.6 * tw);
        ctx.globalAlpha = a * 0.55;
        ctx.strokeStyle = "rgba(226, 236, 255, 1)";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(s.x - len, s.y); ctx.lineTo(s.x + len, s.y);
        ctx.moveTo(s.x, s.y - len); ctx.lineTo(s.x, s.y + len);
        ctx.stroke();
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (0.75 + 0.45 * tw), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      for (const s of stars) drawStar(s);
      if (shot) {
        const p = 1 - shot.life / shot.max;
        const tailX = shot.x - shot.vx * 0.12;
        const tailY = shot.y - shot.vy * 0.12;
        const g2 = ctx.createLinearGradient(shot.x, shot.y, tailX, tailY);
        g2.addColorStop(0, "rgba(255, 255, 255, " + (0.9 * (1 - p)).toFixed(3) + ")");
        g2.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g2;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(shot.x, shot.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const step = (dt: number) => {
      t += dt;
      if (!shot) {
        nextShot -= dt;
        if (nextShot <= 0) {
          const fromLeft = Math.random() > 0.5;
          shot = {
            x: fromLeft ? rand(-60, w * 0.4) : rand(w * 0.6, w + 60),
            y: rand(20, h * 0.45),
            vx: (fromLeft ? 1 : -1) * rand(320, 560),
            vy: rand(180, 320),
            life: rand(0.7, 1.1),
            max: 1.1,
          };
          shot.max = shot.life;
          nextShot = rand(6, 14);
        }
      } else {
        shot.x += shot.vx * dt;
        shot.y += shot.vy * dt;
        shot.life -= dt;
        if (shot.life <= 0) shot = null;
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!activeRef.current) {
        if (wasActive) { ctx.clearRect(0, 0, w, h); wasActive = false; }
        last = now;
        return;
      }
      wasActive = true;
      const dt = Math.min((now - last) / 1000 || 0, 0.05);
      last = now;
      step(dt);
      draw();
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth || window.innerWidth;
      h = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const small = w < 768;
      const smallStars = Array.from({ length: small ? 95 : 240 }, () => newStar(false));
      const bigStars = Array.from({ length: small ? 4 : 8 }, () => newStar(true));
      stars = smallStars.concat(bigStars);
      sprite = makeSprite();
      if (reduce) draw();
    };

    resize();
    addEventListener("resize", resize);
    if (reduce) {
      draw();
    } else {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
    return () => {
      removeEventListener("resize", resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      data-bg="twinkle-stars"
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: active ? 1 : 0, transition: "opacity 1000ms ease" }}
    />
  );
}