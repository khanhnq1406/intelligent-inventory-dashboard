"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Car, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/inventory", icon: Car, label: "Inventory" },
  { href: "/aging", icon: Clock, label: "Aging Stock" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    // hidden on mobile (<768px), icon-only on md+ (768px+)
    <aside className="fixed left-0 top-0 z-40 hidden md:flex h-screen w-16 flex-col items-center bg-zinc-950 py-4">
      {/* Logo */}
      <Link
        href="/"
        className="mb-8 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white"
      >
        IV
      </Link>

      {/* Nav icons */}
      <nav role="navigation" aria-label="Main navigation" className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
              title={item.label}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle at bottom */}
      <ThemeToggle />
    </aside>
  );
}
