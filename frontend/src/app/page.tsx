"use client";

import { useCallback, useState } from "react";
import { TerminalProvider } from "@/providers/TerminalProvider";
import { CRTScreen } from "@/components/effects/CRTScreen";
import { BootSequence } from "@/components/boot/BootSequence";
import { Terminal } from "@/components/terminal/Terminal";

export default function Home() {
  const [booted, setBooted] = useState(false);

  const handleBootComplete = useCallback(() => setBooted(true), []);

  return (
    <TerminalProvider>
      <CRTScreen>
        {booted ? <Terminal /> : <BootSequence onComplete={handleBootComplete} />}
      </CRTScreen>
    </TerminalProvider>
  );
}
