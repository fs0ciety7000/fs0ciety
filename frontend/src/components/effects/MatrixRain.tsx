"use client";

import { useEffect, useRef } from "react";

const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";
const FONT_SIZE = 14;
const FADE = 0.04;

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let columns: number;
    let drops: number[];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      columns = Math.floor(canvas!.width / FONT_SIZE);
      drops = Array.from({ length: columns }, () =>
        Math.random() * -canvas!.height / FONT_SIZE
      );
    }

    function draw() {
      ctx!.fillStyle = `rgba(10, 10, 10, ${FADE})`;
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      for (let i = 0; i < columns; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x = i * FONT_SIZE;
        const y = drops[i] * FONT_SIZE;

        // Head character — bright green
        ctx!.fillStyle = "#00FF41";
        ctx!.font = `${FONT_SIZE}px monospace`;
        ctx!.fillText(char, x, y);

        // Occasionally a brighter white flash at head
        if (Math.random() < 0.02) {
          ctx!.fillStyle = "#AAFFAA";
          ctx!.fillText(char, x, y);
        }

        // Reset when off screen (with random delay)
        if (y > canvas!.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 0.5 + Math.random() * 0.5;
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.12 }}
    />
  );
}
