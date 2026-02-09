"use client";

import type { ReactNode } from "react";

/** Wraps children with CRT scanline + vignette overlay. */
export function CRTScreen({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <div className="crt-overlay" />
      <div className="crt-vignette" />
    </div>
  );
}
