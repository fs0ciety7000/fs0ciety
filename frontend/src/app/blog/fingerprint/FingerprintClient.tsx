"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface FingerprintData {
  // Browser
  userAgent: string;
  platform: string;
  language: string;
  languages: string;
  cookiesEnabled: boolean;
  doNotTrack: string;
  // Screen
  screenRes: string;
  viewport: string;
  colorDepth: number;
  pixelRatio: number;
  touchSupport: boolean;
  // Hardware
  cores: number;
  memory: string;
  gpu: string;
  gpuVendor: string;
  // Network
  connectionType: string;
  protocol: string;
  // Time
  timezone: string;
  timezoneOffset: number;
  // Canvas
  canvasHash: string;
}

function hashCanvas(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "unavailable";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("fs0ciety.fingerprint", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("fs0ciety.fingerprint", 4, 17);
    const data = canvas.toDataURL();
    // Simple hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const c = data.charCodeAt(i);
      hash = ((hash << 5) - hash + c) | 0;
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  } catch {
    return "blocked";
  }
}

function getWebGLInfo(): { renderer: string; vendor: string } {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return { renderer: "unavailable", vendor: "unavailable" };
    const dbg = (gl as WebGLRenderingContext).getExtension(
      "WEBGL_debug_renderer_info"
    );
    if (!dbg) return { renderer: "masked", vendor: "masked" };
    return {
      renderer: (gl as WebGLRenderingContext).getParameter(
        dbg.UNMASKED_RENDERER_WEBGL
      ),
      vendor: (gl as WebGLRenderingContext).getParameter(
        dbg.UNMASKED_VENDOR_WEBGL
      ),
    };
  } catch {
    return { renderer: "blocked", vendor: "blocked" };
  }
}

export default function FingerprintPage() {
  const [data, setData] = useState<FingerprintData | null>(null);
  const [entropyBits, setEntropyBits] = useState(0);

  useEffect(() => {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { effectiveType?: string };
    };
    const webgl = getWebGLInfo();
    const canvasH = hashCanvas();

    const fp: FingerprintData = {
      userAgent: nav.userAgent,
      platform: nav.platform || "unknown",
      language: nav.language,
      languages: nav.languages?.join(", ") || nav.language,
      cookiesEnabled: nav.cookieEnabled,
      doNotTrack: nav.doNotTrack || "unset",
      screenRes: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      touchSupport: "ontouchstart" in window || nav.maxTouchPoints > 0,
      cores: nav.hardwareConcurrency || 0,
      memory: nav.deviceMemory ? `${nav.deviceMemory} GB` : "unavailable",
      gpu: webgl.renderer,
      gpuVendor: webgl.vendor,
      connectionType: nav.connection?.effectiveType || "unknown",
      protocol: window.location.protocol,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      canvasHash: canvasH,
    };

    setData(fp);

    // Rough entropy estimate (bits of uniqueness per field)
    let bits = 0;
    bits += Math.log2(10000); // user agent ~13 bits
    bits += Math.log2(50); // platform ~5 bits
    bits += Math.log2(100); // language ~6 bits
    bits += Math.log2(200); // screen res ~7 bits
    bits += Math.log2(20); // color depth ~4 bits
    bits += Math.log2(10); // pixel ratio ~3 bits
    bits += Math.log2(16); // cores ~4 bits
    bits += Math.log2(40); // timezone ~5 bits
    bits += 32; // canvas hash ~32 bits
    bits += Math.log2(5000); // GPU ~12 bits
    setEntropyBits(Math.round(bits));
  }, []);

  const Row = ({
    label,
    value,
    warn,
  }: {
    label: string;
    value: string;
    warn?: boolean;
  }) => (
    <div className="flex items-start gap-4 py-2 border-b border-terminal-gray-light/50">
      <span className="text-terminal-green-dim w-40 shrink-0 text-xs uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`text-xs break-all ${warn ? "text-terminal-red" : "text-[#d4d4d4]"}`}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/blog"
        className="text-xs font-mono text-terminal-green-dim hover:text-terminal-green transition-colors inline-block mb-8"
      >
        &larr; cd /blog
      </Link>

      <header className="mb-8 pb-6 border-b border-terminal-gray-light">
        <h1 className="text-2xl font-mono font-bold text-terminal-green mb-2">
          Browser Fingerprint Analysis
        </h1>
        <p className="text-sm text-[#a3a3a3] font-mono">
          This is what websites can learn about you without cookies or login.
        </p>
      </header>

      {/* Threat level indicator */}
      <div className="border border-terminal-red/40 bg-terminal-black-light p-4 mb-8 font-mono">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-terminal-red text-xs uppercase tracking-wider font-bold">
            Entropy Score
          </span>
          <span className="text-terminal-amber text-lg font-bold">
            ~{entropyBits} bits
          </span>
        </div>
        <div className="w-full h-2 bg-terminal-gray-light mt-2 mb-3">
          <div
            className="h-full transition-all duration-1000"
            style={{
              width: `${Math.min(100, (entropyBits / 100) * 100)}%`,
              background:
                entropyBits > 50
                  ? "#FF0033"
                  : entropyBits > 30
                    ? "#FFB000"
                    : "#00FF41",
            }}
          />
        </div>
        <p className="text-xs text-[#a3a3a3]">
          {entropyBits > 50
            ? "HIGH — Your browser is highly unique. You are easily trackable across sites."
            : entropyBits > 30
              ? "MEDIUM — Your browser has moderate uniqueness. Consider hardening."
              : "LOW — Your browser blends in with others. Good OPSEC."}
        </p>
      </div>

      {!data ? (
        <div className="text-terminal-green-dim text-sm animate-pulse font-mono">
          Scanning client environment...
        </div>
      ) : (
        <div className="space-y-6 font-mono">
          {/* Browser Section */}
          <section>
            <h2 className="text-sm text-terminal-amber uppercase tracking-wider font-bold mb-3">
              <span className="text-terminal-green mr-2">$</span>
              Browser
            </h2>
            <div className="border border-terminal-gray-light bg-terminal-black-light p-4">
              <Row label="User-Agent" value={data.userAgent} warn />
              <Row label="Platform" value={data.platform} />
              <Row label="Language" value={data.language} />
              <Row label="All Languages" value={data.languages} />
              <Row
                label="Cookies"
                value={data.cookiesEnabled ? "enabled" : "disabled"}
              />
              <Row
                label="Do Not Track"
                value={data.doNotTrack}
                warn={data.doNotTrack === "unset"}
              />
            </div>
          </section>

          {/* Display Section */}
          <section>
            <h2 className="text-sm text-terminal-amber uppercase tracking-wider font-bold mb-3">
              <span className="text-terminal-green mr-2">$</span>
              Display
            </h2>
            <div className="border border-terminal-gray-light bg-terminal-black-light p-4">
              <Row label="Screen" value={data.screenRes} />
              <Row label="Viewport" value={data.viewport} />
              <Row label="Color Depth" value={`${data.colorDepth}-bit`} />
              <Row label="Pixel Ratio" value={`${data.pixelRatio}x`} />
              <Row
                label="Touch"
                value={data.touchSupport ? "yes" : "no"}
              />
            </div>
          </section>

          {/* Hardware Section */}
          <section>
            <h2 className="text-sm text-terminal-amber uppercase tracking-wider font-bold mb-3">
              <span className="text-terminal-green mr-2">$</span>
              Hardware
            </h2>
            <div className="border border-terminal-gray-light bg-terminal-black-light p-4">
              <Row
                label="CPU Cores"
                value={data.cores ? `${data.cores}` : "hidden"}
              />
              <Row label="Memory" value={data.memory} />
              <Row label="GPU" value={data.gpu} warn />
              <Row label="GPU Vendor" value={data.gpuVendor} />
            </div>
          </section>

          {/* Network Section */}
          <section>
            <h2 className="text-sm text-terminal-amber uppercase tracking-wider font-bold mb-3">
              <span className="text-terminal-green mr-2">$</span>
              Network
            </h2>
            <div className="border border-terminal-gray-light bg-terminal-black-light p-4">
              <Row label="Connection" value={data.connectionType} />
              <Row label="Protocol" value={data.protocol} />
            </div>
          </section>

          {/* Fingerprinting Section */}
          <section>
            <h2 className="text-sm text-terminal-amber uppercase tracking-wider font-bold mb-3">
              <span className="text-terminal-green mr-2">$</span>
              Fingerprints
            </h2>
            <div className="border border-terminal-gray-light bg-terminal-black-light p-4">
              <Row label="Timezone" value={data.timezone} />
              <Row
                label="UTC Offset"
                value={`${data.timezoneOffset > 0 ? "-" : "+"}${Math.abs(data.timezoneOffset / 60)}h`}
              />
              <Row label="Canvas Hash" value={data.canvasHash} warn />
            </div>
          </section>

          {/* OPSEC Recommendations */}
          <section className="border border-terminal-green/20 bg-terminal-black-light p-6 mt-8">
            <h2 className="text-sm text-terminal-green uppercase tracking-wider font-bold mb-4">
              OPSEC Hardening Recommendations
            </h2>
            <ul className="space-y-2 text-xs text-[#a3a3a3]">
              <li>
                <span className="text-terminal-green mr-2">[+]</span>
                Use Tor Browser to normalize your fingerprint across sessions
              </li>
              <li>
                <span className="text-terminal-green mr-2">[+]</span>
                Enable resistFingerprinting in Firefox (privacy.resistFingerprinting = true)
              </li>
              <li>
                <span className="text-terminal-green mr-2">[+]</span>
                Use a common screen resolution (1920x1080) to blend in
              </li>
              <li>
                <span className="text-terminal-green mr-2">[+]</span>
                Disable WebGL or use a spoofing extension to mask GPU info
              </li>
              <li>
                <span className="text-terminal-green mr-2">[+]</span>
                Block canvas fingerprinting via CanvasBlocker addon
              </li>
              <li>
                <span className="text-terminal-green mr-2">[+]</span>
                Use uBlock Origin + strict privacy settings
              </li>
              <li>
                <span className="text-terminal-amber mr-2">[!]</span>
                Do Not Track header can paradoxically make you more unique
              </li>
              <li>
                <span className="text-terminal-amber mr-2">[!]</span>
                Unique fonts and browser extensions add entropy — minimize both
              </li>
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
