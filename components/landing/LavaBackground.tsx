"use client";

import { useEffect, useRef } from "react";
import styles from "./lava.module.css";

const BLOBS = [
  { color: "rgba(45, 158, 111, 0.55)", x: 0.2, y: 0.3, r: 0.35, dx: 0.00018, dy: 0.00022 },
  { color: "rgba(255, 140, 90, 0.48)", x: 0.75, y: 0.25, r: 0.42, dx: -0.00016, dy: 0.00024 },
  { color: "rgba(255, 217, 90, 0.42)", x: 0.55, y: 0.7, r: 0.38, dx: 0.00021, dy: -0.00019 },
  { color: "rgba(30, 122, 122, 0.45)", x: 0.15, y: 0.8, r: 0.3, dx: -0.0002, dy: -0.00015 },
  { color: "rgba(13, 59, 46, 0.35)", x: 0.88, y: 0.65, r: 0.32, dx: 0.00014, dy: 0.0002 },
];

export function LavaBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduceMotion = motionQuery.matches;
    let raf = 0;

    const state = BLOBS.map((b) => ({ ...b, phase: Math.random() * Math.PI * 2 }));

    function resize(c: HTMLCanvasElement, x: CanvasRenderingContext2D) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.floor(window.innerWidth * dpr);
      c.height = Math.floor(window.innerHeight * dpr);
      c.style.width = `${window.innerWidth}px`;
      c.style.height = `${window.innerHeight}px`;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(x: CanvasRenderingContext2D) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      x.clearRect(0, 0, w, h);
      x.globalCompositeOperation = "screen";

      for (const b of state) {
        const cx = (0.5 + Math.sin(b.phase * 0.7) * 0.08 + b.x) * w;
        const cy = (0.5 + Math.cos(b.phase * 0.9) * 0.08 + b.y) * h;
        const radius = (b.r + Math.sin(b.phase) * 0.04) * Math.min(w, h);

        const g = x.createRadialGradient(cx, cy, 0, cx, cy, radius);
        g.addColorStop(0, b.color);
        g.addColorStop(0.55, b.color.replace(/[\d.]+\)$/, "0.18)"));
        g.addColorStop(1, "rgba(0,0,0,0)");

        x.beginPath();
        x.arc(cx, cy, radius, 0, Math.PI * 2);
        x.fillStyle = g;
        x.fill();
      }

      x.globalCompositeOperation = "source-over";
    }

    function step(x: CanvasRenderingContext2D) {
      if (!reduceMotion) {
        state.forEach((b) => {
          b.phase += 0.003;
        });
      }
      draw(x);
      raf = requestAnimationFrame(() => step(x));
    }

    function onChange() {
      reduceMotion = motionQuery.matches;
    }

    const onResize = () => resize(canvas, ctx);

    resize(canvas, ctx);
    window.addEventListener("resize", onResize);
    motionQuery.addEventListener("change", onChange);
    raf = requestAnimationFrame(() => step(ctx));

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      motionQuery.removeEventListener("change", onChange);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
