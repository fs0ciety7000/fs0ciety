"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("fs0ciety_token");
    if (!token) {
      router.replace("/login");
    } else {
      setReady(true);
    }
    // Apply blog theme preference to admin pages too
    const theme = localStorage.getItem("fs0ciety_blog_theme");
    if (theme === "industrial") {
      document.documentElement.setAttribute("data-theme", "industrial");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="admin-layout min-h-screen bg-terminal-black flex items-center justify-center">
        <div className="font-mono text-terminal-green-dim text-sm animate-pulse">
          Authenticating...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout min-h-screen flex bg-terminal-black">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
