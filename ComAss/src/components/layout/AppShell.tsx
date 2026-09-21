"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useApp } from "./Providers";

/**
 * App chrome (Sidebar + Header + <main>). /login is shown full-screen without it.
 * On small screens the sidebar becomes a slide-over drawer opened from the Header menu button.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { demoMode } = useApp();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);

  if (pathname === "/login" || pathname === "/login/") {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />

      {navOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setNavOpen(false)} />
          <div className="relative">
            <Sidebar mobile onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setNavOpen(true)} />
        {demoMode && (
          <div role="status" className="bg-amber-50 border-b border-amber-200 text-amber-800 text-xs px-4 md:px-6 py-2 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px text-amber-600" />
            <p>
              <strong>Demo mode:</strong> Google OAuth isn&apos;t configured, so this app uses sample data and does not send real
              emails. See Settings to enable Gmail.
            </p>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </>
  );
}
