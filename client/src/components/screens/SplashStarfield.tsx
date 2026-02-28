import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  brightness: number;
}

function makeStar(seed: number): Star {
  const s = (n: number) => {
    const v = Math.sin(n * 12.9898 + n * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  return {
    x: s(seed) * 2 - 1,
    y: s(seed + 1) * 2 - 1,
    z: s(seed + 2) * 0.9 + 0.1,
    size: 0.5 + s(seed + 3) * 1.5,
    brightness: 0.5 + s(seed + 4) * 0.5,
  };
}

const STARS: Star[] = Array.from({ length: 250 }, (_, i) => makeStar(i * 7.31));

export function SplashStarfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const render = () => {
      t += 0.0003;
      const { width, height } = canvas;
      ctx.fillStyle = "#020208";
      ctx.fillRect(0, 0, width, height);

      // Draw sun glow
      const sunX = width * 0.5;
      const sunY = height * 0.48;
      const grd = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 80);
      grd.addColorStop(0, "rgba(255,220,100,0.95)");
      grd.addColorStop(0.3, "rgba(255,150,30,0.5)");
      grd.addColorStop(0.7, "rgba(255,80,10,0.1)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
      ctx.fill();

      // Sun core
      ctx.fillStyle = "rgba(255,240,150,1)";
      ctx.beginPath();
      ctx.arc(sunX, sunY, 8 + Math.sin(t * 8) * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw stars with slow parallax drift
      STARS.forEach((star) => {
        const drift = t * 0.015 * (1 - star.z);
        const px = ((star.x + 1 + drift) % 2) * (width / 2);
        const py = ((star.y + 1) % 2) * (height / 2);
        const twinkle = 0.7 + 0.3 * Math.sin(t * 80 * star.z + star.x * 10);
        const alpha = star.brightness * twinkle;
        ctx.fillStyle = `rgba(200,220,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, star.size * star.z, 0, Math.PI * 2);
        ctx.fill();
      });

      // Orbiting planet dots
      const planets = [
        { dist: 0.12, speed: 0.8, size: 2.5, color: "rgba(180,160,140,0.9)" },
        { dist: 0.16, speed: 0.5, size: 3, color: "rgba(200,180,120,0.9)" },
        { dist: 0.21, speed: 0.35, size: 4, color: "rgba(100,140,220,0.9)" },
        { dist: 0.28, speed: 0.25, size: 3.5, color: "rgba(210,150,110,0.9)" },
        { dist: 0.38, speed: 0.15, size: 6, color: "rgba(200,175,130,0.9)" },
      ];
      const cx = sunX;
      const cy = sunY;
      const scale = Math.min(width, height) * 0.5;
      planets.forEach((p, i) => {
        const angle = t * p.speed + i * 1.3;
        const px = cx + Math.cos(angle) * p.dist * scale;
        const py = cy + Math.sin(angle) * p.dist * scale * 0.35;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animFrame = requestAnimationFrame(render);
      frameRef.current = animFrame;
    };

    render();
    return () => {
      cancelAnimationFrame(animFrame);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}
