"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import styles from "@/app/landing.module.css";

// Loaded in the browser only, so the page renders without it first.
const MeshGradient = dynamic(() => import("@paper-design/shaders-react").then((module) => module.MeshGradient), { ssr: false });

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * A soft moving gradient behind the hero. The wrapper always shows a static CSS gradient with the same
 * colours; the shader is mounted only when WebGL works and the visitor has not asked for reduced motion.
 */
export function HeroBackground() {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAnimated(!query.matches && webglAvailable());
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <div className={styles.background} aria-hidden="true">
      {animated ? (
        <MeshGradient className={styles.shader} colors={["#237b55", "#0f766e", "#f8fbf8", "#eaf3ee"]} speed={0.25} distortion={0.8} swirl={0.1} />
      ) : null}
      <div className={styles.veil} />
    </div>
  );
}
