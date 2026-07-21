"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Resumen" },
  // The player route ("/dashboard/songs" and "/dashboard/songs/<id>") is a
  // separate tab from the song library ("/dashboard/songs/library") even
  // though one is nested under the other — matched explicitly below so they
  // never both light up as active at once.
  { href: "/dashboard/songs", label: "Reproductor" },
  { href: "/dashboard/songs/library", label: "Canciones" },
  { href: "/dashboard/playlists", label: "Playlist" },
  { href: "/dashboard/categories", label: "Categorías" },
];

function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === href;
  if (href === "/dashboard/songs") {
    return pathname === "/dashboard/songs" || /^\/dashboard\/songs\/\d+/.test(pathname);
  }
  return pathname.startsWith(href);
}

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 px-3 sm:px-6 md:px-10">
      {NAV_ITEMS.map((item) => {
        const isActive = isNavItemActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm whitespace-nowrap transition",
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
