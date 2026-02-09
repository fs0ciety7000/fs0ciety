import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          green: "#00FF41",
          "green-dim": "#00CC33",
          red: "#FF0033",
          "red-dim": "#CC0029",
          amber: "#FFB000",
          cyan: "#00D4FF",
          black: "#0A0A0A",
          "black-light": "#111111",
          gray: "#1A1A1A",
          "gray-light": "#2A2A2A",
        },
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Cascadia Code",
          "monospace",
        ],
      },
      animation: {
        blink: "blink 1s step-end infinite",
        scanline: "scanline 8s linear infinite",
        glitch: "glitch 0.3s ease-in-out infinite alternate",
        "glitch-skew": "glitch-skew 1s ease-in-out infinite alternate",
        flicker: "flicker 0.15s infinite",
        "type-cursor": "type-cursor 1s step-end infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        glitch: {
          "0%": { transform: "translate(0)" },
          "20%": { transform: "translate(-2px, 2px)" },
          "40%": { transform: "translate(-2px, -2px)" },
          "60%": { transform: "translate(2px, 2px)" },
          "80%": { transform: "translate(2px, -2px)" },
          "100%": { transform: "translate(0)" },
        },
        "glitch-skew": {
          "0%": { transform: "skew(0deg)" },
          "20%": { transform: "skew(-2deg)" },
          "60%": { transform: "skew(1deg)" },
          "100%": { transform: "skew(0deg)" },
        },
        flicker: {
          "0%": { opacity: "0.27861" },
          "5%": { opacity: "0.34769" },
          "10%": { opacity: "0.23604" },
          "15%": { opacity: "0.90626" },
          "20%": { opacity: "0.18128" },
          "25%": { opacity: "0.83891" },
          "30%": { opacity: "0.65583" },
          "35%": { opacity: "0.67807" },
          "40%": { opacity: "0.26559" },
          "45%": { opacity: "0.84693" },
          "50%": { opacity: "0.96019" },
          "55%": { opacity: "0.08594" },
          "60%": { opacity: "0.20313" },
          "65%": { opacity: "0.71988" },
          "70%": { opacity: "0.53455" },
          "75%": { opacity: "0.37288" },
          "80%": { opacity: "0.71428" },
          "85%": { opacity: "0.70419" },
          "90%": { opacity: "0.7003" },
          "95%": { opacity: "0.36108" },
          "100%": { opacity: "0.24387" },
        },
        "type-cursor": {
          "0%, 100%": { borderColor: "transparent" },
          "50%": { borderColor: "#00FF41" },
        },
      },
      boxShadow: {
        terminal: "0 0 10px rgba(0, 255, 65, 0.3), 0 0 20px rgba(0, 255, 65, 0.1)",
        "terminal-red": "0 0 10px rgba(255, 0, 51, 0.3), 0 0 20px rgba(255, 0, 51, 0.1)",
        crt: "inset 0 0 50px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
