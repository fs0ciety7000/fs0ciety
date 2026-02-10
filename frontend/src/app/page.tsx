"use client";

import { useCallback, useState } from "react";
import { TerminalProvider } from "@/providers/TerminalProvider";
import { CRTScreen } from "@/components/effects/CRTScreen";
import { BootSequence } from "@/components/boot/BootSequence";
import { MaskReveal } from "@/components/effects/MaskReveal";
import { Terminal } from "@/components/terminal/Terminal";
import { MatrixRain } from "@/components/effects/MatrixRain";
import { KonamiCode } from "@/components/effects/KonamiCode";

type Phase = "boot" | "reveal" | "terminal";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("boot");

  const handleBootComplete = useCallback(() => setPhase("reveal"), []);
  const handleRevealComplete = useCallback(() => setPhase("terminal"), []);

  return (
    <TerminalProvider>
      <KonamiCode />
      <MatrixRain />
      <CRTScreen>
        {phase === "boot" && <BootSequence onComplete={handleBootComplete} />}
        {phase === "reveal" && <MaskReveal onComplete={handleRevealComplete} />}
        {phase === "terminal" && <Terminal />}
      </CRTScreen>
    </TerminalProvider>
  );
}
