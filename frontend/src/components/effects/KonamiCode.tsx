"use client";

import { useEffect, useState } from "react";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const FSOCIETY_ART = [
  "                          ██████                          ",
  "                      ████      ████                      ",
  "                   ███              ███                    ",
  "                 ██     ██      ██     ██                  ",
  "               ██      ████    ████      ██               ",
  "              █         ██      ██         █              ",
  "             █                              █             ",
  "            █    █                    █      █            ",
  "            █     ████████████████████       █            ",
  "             █                              █             ",
  "              █                            █              ",
  "               ██                        ██               ",
  "                 ███                  ███                  ",
  "                    ████          ████                     ",
  "                        ██████████                        ",
];

const GLITCH_MESSAGES = [
  "YOU ARE NOT ALONE",
  "CONTROL IS AN ILLUSION",
  "OUR DEMOCRACY HAS BEEN HACKED",
  "WE ARE FSOCIETY",
  "HELLO, FRIEND",
];

export function KonamiCode() {
  const [triggered, setTriggered] = useState(false);
  const [glitchText, setGlitchText] = useState("");
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let pos = 0;

    function onKey(e: KeyboardEvent) {
      if (e.key === KONAMI[pos]) {
        pos++;
        if (pos === KONAMI.length) {
          setTriggered(true);
          pos = 0;
        }
      } else {
        pos = e.key === KONAMI[0] ? 1 : 0;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!triggered) return;

    // Phase 1: glitch text cycling
    let msgIdx = 0;
    const textInterval = setInterval(() => {
      setGlitchText(GLITCH_MESSAGES[msgIdx % GLITCH_MESSAGES.length]);
      msgIdx++;
    }, 600);

    // Phase 2: show ASCII art
    const artTimer = setTimeout(() => setPhase(1), 2000);

    // Phase 3: final message
    const finalTimer = setTimeout(() => setPhase(2), 4000);

    // Auto-dismiss
    const dismissTimer = setTimeout(() => {
      setTriggered(false);
      setPhase(0);
      setGlitchText("");
    }, 6500);

    return () => {
      clearInterval(textInterval);
      clearTimeout(artTimer);
      clearTimeout(finalTimer);
      clearTimeout(dismissTimer);
    };
  }, [triggered]);

  if (!triggered) return null;

  return (
    <div
      className="konami-overlay"
      onClick={() => {
        setTriggered(false);
        setPhase(0);
      }}
    >
      {/* Scanlines */}
      <div className="konami-scanlines" />

      {/* Glitch text */}
      <div className="konami-content">
        {phase < 2 && (
          <div className="konami-glitch-text" data-text={glitchText}>
            {glitchText}
          </div>
        )}

        {phase >= 1 && (
          <pre className="konami-ascii">
            {FSOCIETY_ART.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </pre>
        )}

        {phase >= 2 && (
          <div className="konami-final">
            <span className="text-terminal-red">root@fs0ciety</span>
            <span className="text-[#555]">:</span>
            <span className="text-terminal-cyan">~</span>
            <span className="text-[#555]">$ </span>
            <span className="text-terminal-green konami-type">
              we are fs0ciety, we are finally free
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
