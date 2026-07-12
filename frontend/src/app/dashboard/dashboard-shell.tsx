"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useHydratedAuth } from "@/hooks/use-hydrated-auth";
import { useAuthStore } from "@/lib/auth-store";
import { useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { DashboardNav } from "./dashboard-nav";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hasHydrated, isAuthenticated } = useHydratedAuth();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-svh flex-1 items-center justify-center bg-background">
        <span className="font-mono text-xs tracking-[0.3em] text-white/40 uppercase">
          Cargando...
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4 md:px-10">
        <Link href="/dashboard" className="font-mono text-sm tracking-[0.3em] text-white/80 uppercase">
          StudioDesk
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/60">{user?.full_name}</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            Salir
          </Button>
        </div>
      </header>
      <DashboardNav />
      <main className="flex-1 px-6 py-10 md:px-10">{children}</main>
    </div>
  );
}
