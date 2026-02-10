"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getAuthUser } from "@/lib/auth-cookie";
import { MaintenancePage } from "./MaintenancePage";

/**
 * Wraps the app and shows a maintenance page when the backend
 * reports maintenance mode enabled. Admin users bypass it.
 */
export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [maintenance, setMaintenance] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;

    async function check() {
      try {
        const res = await fetch("/api/maintenance");
        if (res.ok && active) {
          const data = await res.json();
          setMaintenance(data.enabled === true);
        }
      } catch {
        // Backend unreachable — don't block
      } finally {
        if (active) setChecked(true);
      }
    }

    check();
    // Re-check every 30s (in case admin toggles it while user is on site)
    const interval = setInterval(check, 30_000);
    return () => { active = false; clearInterval(interval); };
  }, [pathname]);

  // Don't block until we've checked
  if (!checked) return <>{children}</>;

  // Admin users always bypass maintenance
  if (maintenance) {
    const user = getAuthUser();
    if (user?.role === "admin") return <>{children}</>;
    // Allow access to login page so admin can log in
    if (pathname === "/login" || pathname === "/forgot-password" || pathname?.startsWith("/reset-password")) {
      return <>{children}</>;
    }
    return <MaintenancePage />;
  }

  return <>{children}</>;
}
