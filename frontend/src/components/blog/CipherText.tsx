"use client";

import { useEffect, useRef, useState } from "react";

const CIPHER_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?/<>{}[]|\\^~";

interface CipherTextProps {
  text: string;
  className?: string;
  /** ms per character reveal (default 30) */
  speed?: number;
  /** Number of random cycles before revealing each char (default 4) */
  cycles?: number;
}

export function CipherText({
  text,
  className = "",
  speed = 30,
  cycles = 4,
}: CipherTextProps) {
  const [display, setDisplay] = useState("");
  const frameRef = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let charIndex = 0;
    let cycleCount = 0;
    const revealed: string[] = [];

    function tick() {
      if (!mounted.current) return;

      if (charIndex >= text.length) {
        setDisplay(text);
        return;
      }

      if (cycleCount < cycles) {
        // Show random character at current position
        const scrambled = revealed.join("") +
          CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)] +
          Array.from({ length: text.length - charIndex - 1 }, () =>
            CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)]
          ).join("");
        setDisplay(scrambled);
        cycleCount++;
      } else {
        // Reveal the real character
        revealed.push(text[charIndex]);
        charIndex++;
        cycleCount = 0;
      }

      frameRef.current = window.setTimeout(tick, speed);
    }

    tick();

    return () => {
      mounted.current = false;
      clearTimeout(frameRef.current);
    };
  }, [text, speed, cycles]);

  return (
    <span className={`font-mono ${className}`}>
      {display}
    </span>
  );
}

/** Loading placeholder with cipher scramble effect */
export function CipherLoading({
  text = "Loading...",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div className={`font-mono text-terminal-green-dim text-sm ${className}`}>
      <CipherText text={text} speed={25} cycles={3} />
    </div>
  );
}
