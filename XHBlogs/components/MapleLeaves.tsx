"use client";
import { useEffect, useRef } from "react";

// 日间背景：枫叶飘落 + 金粉飘散（canvas 单循环，手机端粒子数自动减半）
const LEAF_COLORS = ["#b45309", "#c2410c", "#d97706", "#ea7317", "#f2a541"];

type Leaf = {
  x: number; y: number; size: number; vy: number; vx: number;
  rot: number; vr: number; sway: number; phase: number; color: string; alpha: number;
};
type Dust = { x: number; y: number; r: number; vy: number; vx: number; phase: number; alpha: number };

export default function MapleLeaves({ active = true }: { active?: boolean }) {
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
    let leaves: Leaf[] = [];
    let dust: Dust[] = [];
    let sprite: HTMLCanvasElement | null = null;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const makeSprite = () => {
      const s = document.createElement("canvas");
      s.width = 32; s.height = 32;
      const c = s.getContext("2d");
      if (!c) return s;
      const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, "rgba(255, 236, 178, 0.95)");
      g.addColorStop(0.35, "rgba(255, 208, 122, 0.5)");
      g.addColorStop(1, "rgba(255, 190, 90, 0)");
      c.fillStyle = g;
      c.fillRect(0, 0, 32, 32);
      return s;
    };

    const newLeaf = (initial: boolean): Leaf => ({
      x: rand(-40, w + 40),
      y: initial ? rand(-h * 0.2, h) : rand(-90, -20),
      size: rand(7, 16),
      vy: rand(16, 44),
      vx: rand(-14, 14),
      rot: rand(0, Math.PI * 2),
      vr: rand(-1.1, 1.1),
      sway: rand(10, 34),
      phase: rand(0, Math.PI * 2),
      color: LEAF_COLORS[(Math.random() * LEAF_COLORS.length) | 0],
      alpha: rand(0.5, 0.9),
    });

    const newDust = (initial: boolean): Dust => ({
      x: rand(0, w || 1),
      y: initial ? rand(0, h || 1) : rand(-40, 0),
      r: rand(0.8, 2.2),
      vy: rand(9, 26),
      vx: rand(-8, 8),
      phase: rand(0, Math.PI * 2),
      alpha: rand(0.35, 0.9),
    });

    const leafShape = (size: number) => {
      const steps = 110;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const lobe = Math.abs(Math.cos(2.5 * a)); // 五个尖角 → 枫叶轮廓
        const r = (0.42 + 0.58 * Math.pow(lobe, 0.55)) * size;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath();
    };

    const drawLeaf = (l: Leaf) => {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      ctx.globalAlpha = l.alpha;
      ctx.fillStyle = l.color;
      leafShape(l.size);
      ctx.fill();
      ctx.globalAlpha = l.alpha * 0.4;
      ctx.strokeStyle = "#7c2d12";
      ctx.lineWidth = Math.max(0.6, l.size * 0.06);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * l.size * 0.9, Math.sin(a) * l.size * 0.9);
        ctx.stroke();
      }
      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      if (sprite) {
        for (const d of dust) {
          const tw = 0.55 + 0.45 * Math.sin(t * 2.2 + d.phase);
          const rr = d.r * (0.9 + 0.5 * tw) * 6;
          ctx.globalAlpha = d.alpha * tw;
          ctx.drawImage(sprite, d.x - rr / 2, d.y - rr / 2, rr, rr);
        }
      }
      ctx.globalAlpha = 1;
      for (const l of leaves) drawLeaf(l);
      ctx.globalAlpha = 1;
    };

    const step = (dt: number) => {
      t += dt;
      for (const l of leaves) {
        l.y += l.vy * dt;
        l.x += (l.vx + Math.sin(t * 0.9 + l.phase) * l.sway) * dt;
        l.rot += l.vr * dt;
        if (l.y > h + 70 || l.x < -140 || l.x > w + 140) Object.assign(l, newLeaf(false));
      }
      for (const d of dust) {
        d.y += d.vy * dt;
        d.x += (d.vx + Math.sin(t * 0.6 + d.phase) * 6) * dt;
        if (d.y > h + 20) Object.assign(d, newDust(false));
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
      leaves = Array.from({ length: small ? 14 : 30 }, () => newLeaf(true));
      dust = Array.from({ length: small ? 34 : 78 }, () => newDust(true));
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
      data-bg="maple-leaves"
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: active ? 1 : 0, transition: "opacity 1000ms ease" }}
    />
  );
}