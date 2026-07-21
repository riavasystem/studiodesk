"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Resumen" },
  { href: "/dashboard/songs", label: "Reproductor" },
  { href: "/dashboard/playlists", label: "Playlists" },
  { href: "/dashboard/albums", label: "Álbumes" },
  { href: "/dashboard/categories", label: "Categorías" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 px-6 md:px-10">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "border-b-2 px-3 py-3 text-sm whitespace-nowrap transition",
              isActive
                ? "border-orange-500 text-white"
                : "border-transparent text-white/50 hover:text-white/80",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
