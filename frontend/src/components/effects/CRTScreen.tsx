"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Wraps children with CRT scanline + vignette overlay + random flicker. */
export function CRTScreen({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function scheduleFlicker() {
      const delay = 15000 + Math.random() * 30000; // 15-45s
      timer = setTimeout(() => {
        const el = containerRef.current;
        if (el) {
          el.classList.add("crt-flicker");
          setTimeout(() => el.classList.remove("crt-flicker"), 200);
        }
        scheduleFlicker();
      }, delay);
    }

    scheduleFlicker();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {children}
      <div className="crt-overlay" />
      <div className="crt-vignette" />
    </div>
  );
}
