"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const CYCLE: Record<string, string> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const LABELS: Record<string, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

const ICONS: Record<string, React.ElementType> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme = "system", setTheme } = useTheme();
  const Icon = ICONS[theme] ?? Monitor;
  const label = LABELS[theme] ?? "System";

  return (
    <button
      onClick={() => setTheme(CYCLE[theme] ?? "system")}
      title={`Theme: ${label}`}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white",
        className
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
