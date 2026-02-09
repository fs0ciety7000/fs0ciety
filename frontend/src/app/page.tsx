"use client";

import { useCallback, useState } from "react";
import { BootSequence } from "@/components/boot/BootSequence";
import { Terminal } from "@/components/terminal/Terminal";

export default function Home() {
  const [booted, setBooted] = useState(false);

  const handleBootComplete = useCallback(() => setBooted(true), []);

  if (!booted) {
    return <BootSequence onComplete={handleBootComplete} />;
  }

  return <Terminal />;
}
