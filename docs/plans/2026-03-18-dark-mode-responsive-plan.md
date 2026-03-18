# Dark Mode & Mobile Responsive — Implementation Plan

> **For implementation:** Use the secure-feature-pipeline skill, step: implement

**Goal:** Add system-preference-aware dark mode with a manual toggle and make all pages mobile-first responsive with collapsible sidebar, card-based mobile views, and touch-friendly UI.

**Spec:** `docs/specs/2026-03-17-dark-mode-responsive-spec.md`

**Architecture:** No backend changes. All work is frontend-only: install `next-themes`, add `ThemeProvider`, add `dark:` variants to every component, create `ThemeToggle`, `MobileNav`, `VehicleCard`, and `AgingCard` components, and update all four pages for responsive layouts.

**Tech Stack:** Next.js 15 App Router + TanStack Query + shadcn/ui + Tailwind CSS v3 (class-based dark mode)

---

## Security Implementation Notes

- No new data flows — all changes are client-side UI only.
- Theme preference stored in `localStorage` via `next-themes` — negligible security impact (visual only).
- No new API calls, no new server code, no new data models.
- XSS risk: zero — no user-controlled content is rendered as HTML.

---

## C4 Architecture Diagram Updates

**File to update:** `docs/plans/2026-03-17-system-design.md`

Update the **L3 Frontend Component Diagram (section 1.5)** to add:
- `ThemeToggle` component (cycles system/light/dark)
- `MobileNav` component (hamburger + overlay sidebar)
- `VehicleCard` component (mobile card view for inventory list)
- `AgingCard` component (mobile card view for aging list)
- `ThemeProvider` wrapper (next-themes, wraps Providers)

These are added as new `Component(...)` entries with relationships from pages that use them.

---

## Runtime Flow Diagrams

No new runtime flow diagrams needed — purely UI/UX changes, no new API calls or multi-step business logic.

---

## Task Dependency Order

```
Task 0: Update C4 Architecture Diagram
Task 1: Install next-themes + Configure ThemeProvider     [independent]
Task 2: Update tailwind.config.ts + globals.css           [independent]
Task 3: ThemeToggle component                             [depends on Task 1]
Task 4: MobileNav component (hamburger + overlay)         [depends on Task 1]
Task 5: Update Sidebar component (responsive + toggle)    [depends on Task 3, Task 4]
Task 6: Dark mode — StatsCard + Badges + Shared UI        [depends on Task 2]
Task 7: Dark mode — Charts (Recharts color theming)        [depends on Task 2]
Task 8: Dark mode — VehicleFilters + Pagination           [depends on Task 2]
Task 9: Mobile Dashboard Page (FR-3)                      [depends on Task 2, Task 6]
Task 10: VehicleCard component + Mobile Inventory Page (FR-4) [depends on Task 2, Task 6]
Task 11: AgingCard component + Mobile Aging Page (FR-5)   [depends on Task 2, Task 6]
Task 12: Mobile Vehicle Detail Page (FR-6)                [depends on Task 2, Task 6]
Task 13: Update C4 system design doc                      [depends on all above]
Task 14: Final verification pass                          [depends on all above]
```

Tasks 1 and 2 are independent and can run in parallel.
Tasks 6, 7, 8 are independent and can run in parallel after Task 2.
Tasks 9, 10, 11, 12 are independent and can run in parallel after Task 6.

---

## Task 0: Update C4 Architecture Diagram

**Files:**
- Modify: `docs/plans/2026-03-17-system-design.md`

**Steps:**

1. In section 1.5 (L3 Frontend Component Diagram), add these new component declarations after `add_vehicle_modal`:
```
Component(theme_toggle, "ThemeToggle", "React, next-themes", "Cycles system/light/dark theme")
Component(mobile_nav, "MobileNav", "React", "Hamburger button + full-height overlay sidebar")
Component(vehicle_card, "VehicleCard", "React", "Mobile card view for inventory list items")
Component(aging_card, "AgingCard", "React", "Mobile card view for aging stock list items")
```

2. Add relationship lines:
```
Rel(sidebar, theme_toggle, "contains")
Rel(inventory_page, vehicle_card, "uses on mobile")
Rel(aging_page, aging_card, "uses on mobile")
Rel(mobile_nav, sidebar, "replaces on mobile")
```

3. Add `ThemeProvider` to the providers description in the container boundary or as a note.

4. Commit: `docs: update L3 frontend component diagram for dark mode + mobile components`

---

## Task 1: Install next-themes + Configure ThemeProvider

**Files:**
- Modify: `frontend/package.json` (dependency)
- Modify: `frontend/src/lib/providers.tsx`
- Modify: `frontend/src/app/layout.tsx`

**Step 1: Install next-themes**
```bash
cd frontend && npm install next-themes
```

**Step 2: Update `frontend/src/lib/providers.tsx`** — wrap `QueryClientProvider` with `ThemeProvider`:
```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
```

**Step 3: Update `frontend/src/app/layout.tsx`** — add `suppressHydrationWarning` to `<html>`:
```tsx
<html lang="en" suppressHydrationWarning>
```

**Step 4: Verify no TypeScript errors**
```bash
cd frontend && npx tsc --noEmit
```

**Step 5: Commit**
```
feat(dark-mode): install next-themes and configure ThemeProvider
```

---

## Task 2: Update tailwind.config.ts + globals.css

**Files:**
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/src/app/globals.css`

**Step 1: Verify `tailwind.config.ts`** already has `darkMode: ["class"]` — confirmed it does. No change needed there.

**Step 2: Update `frontend/src/app/globals.css`** — replace the `.dark {}` block with the spec-aligned dark color tokens:

```css
.dark {
  /* Background tokens */
  --background: 240 10% 3.9%;        /* zinc-950 #09090B */
  --foreground: 0 0% 98%;            /* zinc-50 #FAFAFA */

  /* Card */
  --card: 240 5.9% 10%;              /* zinc-900 #18181B */
  --card-foreground: 0 0% 98%;       /* zinc-50 */

  /* Popover */
  --popover: 240 5.9% 10%;
  --popover-foreground: 0 0% 98%;

  /* Primary */
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;

  /* Secondary */
  --secondary: 240 3.7% 15.9%;       /* zinc-800 #27272A */
  --secondary-foreground: 0 0% 98%;

  /* Muted */
  --muted: 240 3.7% 15.9%;          /* zinc-800 */
  --muted-foreground: 240 5% 64.9%; /* zinc-400 #A1A1AA */

  /* Accent */
  --accent: 240 3.7% 15.9%;
  --accent-foreground: 0 0% 98%;

  /* Destructive */
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;

  /* Border + Input */
  --border: 240 3.7% 25%;           /* zinc-700 #3F3F46 */
  --input: 240 3.7% 25%;
  --ring: 240 4.9% 83.9%;

  /* Charts — brighter for dark backgrounds */
  --chart-1: 220 70% 50%;
  --chart-2: 160 60% 45%;
  --chart-3: 30 80% 55%;
  --chart-4: 280 65% 60%;
  --chart-5: 340 75% 55%;
}
```

**Step 3: Commit**
```
feat(dark-mode): align dark mode CSS variables with spec color tokens
```

---

## Task 3: ThemeToggle Component

**Files:**
- Create: `frontend/src/components/theme-toggle.tsx`
- Create: `frontend/src/components/__tests__/theme-toggle.test.tsx`

**Step 1: Write the failing test** at `frontend/src/components/__tests__/theme-toggle.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "@/components/theme-toggle";

// Mock next-themes
const mockSetTheme = vi.fn();
let mockTheme = "system";

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: mockTheme, setTheme: mockSetTheme }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
    mockTheme = "system";
  });

  it("renders a button", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("cycles system → light on click", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("cycles light → dark on click", () => {
    mockTheme = "light";
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("cycles dark → system on click", () => {
    mockTheme = "dark";
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });
});
```

**Step 2: Run test to verify it fails**
```bash
cd frontend && npm test -- theme-toggle
```

**Step 3: Implement** `frontend/src/components/theme-toggle.tsx`:
```tsx
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
```

**Step 4: Run test to verify it passes**
```bash
cd frontend && npm test -- theme-toggle
```

**Step 5: Commit**
```
feat(dark-mode): add ThemeToggle component cycling system/light/dark
```

---

## Task 4: MobileNav Component (Hamburger + Overlay Sidebar)

**Files:**
- Create: `frontend/src/components/mobile-nav.tsx`
- Create: `frontend/src/components/__tests__/mobile-nav.test.tsx`

**Step 1: Write the failing test** at `frontend/src/components/__tests__/mobile-nav.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileNav } from "@/components/mobile-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
}));

describe("MobileNav", () => {
  it("renders hamburger button by default", () => {
    render(<MobileNav />);
    expect(screen.getByRole("button", { name: /open menu/i })).toBeTruthy();
  });

  it("opens overlay when hamburger is clicked", () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByRole("navigation")).toBeTruthy();
  });

  it("closes overlay when X button is clicked", () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    fireEvent.click(screen.getByRole("button", { name: /close menu/i }));
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("shows nav items when open", () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Inventory")).toBeTruthy();
    expect(screen.getByText("Aging Stock")).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**
```bash
cd frontend && npm test -- mobile-nav
```

**Step 3: Implement** `frontend/src/components/mobile-nav.tsx`:
```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, Car, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/inventory", icon: Car, label: "Inventory" },
  { href: "/aging", icon: Clock, label: "Aging Stock" },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger button — fixed top-left, mobile only */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-950 text-zinc-400 hover:text-white md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Overlay sidebar */}
      {isOpen && (
        <div
          className="fixed left-0 top-0 z-50 flex h-full w-60 flex-col bg-zinc-950 py-4 shadow-xl transition-transform duration-200 md:hidden"
          role="navigation"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 mb-6">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white"
            >
              IV
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex flex-col gap-1 px-2 flex-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Theme toggle at bottom */}
          <div className="px-2 pt-2">
            <ThemeToggle />
          </div>
        </div>
      )}
    </>
  );
}
```

**Step 4: Run test to verify it passes**
```bash
cd frontend && npm test -- mobile-nav
```

**Step 5: Commit**
```
feat(responsive): add MobileNav component with hamburger + overlay sidebar
```

---

## Task 5: Update Sidebar (Responsive + ThemeToggle)

**Files:**
- Modify: `frontend/src/components/sidebar.tsx`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/components/__tests__/sidebar.test.tsx`

**Step 1: Read existing sidebar test** to understand what to update:
```bash
cat frontend/src/components/__tests__/sidebar.test.tsx
```

**Step 2: Update `frontend/src/components/sidebar.tsx`** — add ThemeToggle at bottom, hide on mobile (desktop only, tablet collapsed to icons):
```tsx
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
    // hidden on mobile (<768px), icon-only on tablet (768px+), same on desktop (1024px+)
    <aside className="fixed left-0 top-0 z-40 hidden md:flex h-screen w-16 flex-col items-center bg-zinc-950 py-4">
      {/* Logo */}
      <Link
        href="/"
        className="mb-8 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white"
      >
        IV
      </Link>

      {/* Nav icons */}
      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
              title={item.label}
            >
              <item.icon className="h-5 w-5" />
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle at bottom */}
      <ThemeToggle />
    </aside>
  );
}
```

**Step 3: Update `frontend/src/app/layout.tsx`** — add `MobileNav`, adjust `<main>` margin for responsive:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/lib/providers";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Intelligent Inventory Dashboard",
  description:
    "Real-time vehicle stock overview with aging stock identification and actionable insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        <Providers>
          <Sidebar />
          <MobileNav />
          {/* On mobile: no left margin (sidebar hidden). On md+: ml-16 for icon sidebar */}
          <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 md:ml-16">
            <div className="mx-auto max-w-7xl px-4 py-4 pt-16 sm:px-6 sm:py-6 md:pt-6">
              {children}
            </div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
```
Note: `pt-16` on mobile to avoid hamburger button overlap; `md:pt-6` resets to normal.

**Step 4: Update sidebar test** — add `hidden md:flex` class expectation, check ThemeToggle renders.

**Step 5: Run tests**
```bash
cd frontend && npm test -- sidebar
```

**Step 6: Commit**
```
feat(responsive): update Sidebar with ThemeToggle + hide on mobile, update layout for MobileNav
```

---

## Task 6: Dark Mode — StatsCard + Badges + Shared UI Components

**Files:**
- Modify: `frontend/src/components/stats-card.tsx`
- Modify: `frontend/src/components/status-badge.tsx`
- Modify: `frontend/src/components/action-badge.tsx`
- Modify: `frontend/src/components/aging-progress-bar.tsx`
- Modify: `frontend/src/components/vehicle-info-card.tsx`
- Modify: `frontend/src/components/action-timeline.tsx`
- Modify: `frontend/src/components/action-form.tsx`
- Modify: `frontend/src/components/add-vehicle-modal.tsx`
- Modify: `frontend/src/components/ui/table.tsx`

**Color mapping reference (from spec):**

| Tailwind light class | Dark replacement |
|---------------------|-----------------|
| `bg-white` (card bg) | `dark:bg-zinc-900` |
| `bg-zinc-50` (secondary bg) | `dark:bg-zinc-900` |
| `bg-zinc-100` (tertiary bg) | `dark:bg-zinc-800` |
| `text-zinc-900` (primary text) | `dark:text-zinc-50` |
| `text-zinc-500` (secondary text) | `dark:text-zinc-400` |
| `text-zinc-400` (tertiary text) | `dark:text-zinc-500` |
| `border-zinc-200` | `dark:border-zinc-700` |
| `text-zinc-600` | `dark:text-zinc-400` |

**Step 1: Read each file before modifying** (required by tool rules).

**Step 2: Update `frontend/src/components/stats-card.tsx`**:
- `bg-white` → `bg-white dark:bg-zinc-900`
- `border-zinc-200` → `border-zinc-200 dark:border-zinc-700`
- `text-zinc-500` → `text-zinc-500 dark:text-zinc-400`
- `text-zinc-900` → `text-zinc-900 dark:text-zinc-50`

**Step 3: Update `frontend/src/components/status-badge.tsx`** — read first, then add `dark:` variants for each status color.

**Step 4: Update `frontend/src/components/action-badge.tsx`** — same pattern, add `dark:` variants.

**Step 5: Update `frontend/src/components/aging-progress-bar.tsx`** — add dark variants to bar and text.

**Step 6: Update `frontend/src/components/vehicle-info-card.tsx`** — add dark variants to container and fields.

**Step 7: Update `frontend/src/components/action-timeline.tsx`** — add dark variants to timeline items.

**Step 8: Update `frontend/src/components/action-form.tsx`** — add dark variants to form inputs and container.

**Step 9: Update `frontend/src/components/add-vehicle-modal.tsx`** — add dark variants to modal container and inputs.

**Step 10: Update `frontend/src/components/ui/table.tsx`** — add dark variants to table header, rows, cells.

**Step 11: Run tests to verify no regressions**
```bash
cd frontend && npm test
```

**Step 12: Commit**
```
feat(dark-mode): add dark: variants to StatsCard, badges, table, form components
```

---

## Task 7: Dark Mode — Charts (Recharts Color Theming)

**Files:**
- Modify: `frontend/src/components/charts/inventory-by-make-chart.tsx`
- Modify: `frontend/src/components/charts/vehicle-status-chart.tsx`

**Step 1: Read both chart files** (already read above).

**Step 2: Update `inventory-by-make-chart.tsx`** — use `useTheme` to detect dark mode and switch colors:
```tsx
"use client";

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "next-themes";
import type { components } from "@/lib/api/types";

type MakeSummary = components["schemas"]["MakeSummary"];

export function InventoryByMakeChart({ data }: { data: MakeSummary[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const gridColor = isDark ? "#3f3f46" : "#f4f4f5";        // zinc-700 : zinc-100
  const tickColor = isDark ? "#a1a1aa" : "#71717a";        // zinc-400 : zinc-500
  const tooltipBorder = isDark ? "#3f3f46" : "#e4e4e7";
  const tooltipBg = isDark ? "#18181b" : "#ffffff";
  const tooltipText = isDark ? "#fafafa" : "#18181b";
  const totalBarColor = isDark ? "#3b82f6" : "#2563eb";    // blue-500 : blue-600
  const agingBarColor = isDark ? "#ef4444" : "#dc2626";    // red-500 : red-600
  const containerBorder = isDark ? "border-zinc-700" : "border-zinc-200";
  const containerBg = isDark ? "bg-zinc-900" : "bg-white";
  const titleColor = isDark ? "text-zinc-50" : "text-zinc-900";

  return (
    <div className={`rounded-xl border ${containerBorder} ${containerBg} p-6`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className={`text-base font-semibold ${titleColor}`}>Inventory by Make</h3>
        <span className="text-xs text-zinc-400">Last 30 days</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="make" tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: `1px solid ${tooltipBorder}`,
                fontSize: "12px",
                backgroundColor: tooltipBg,
                color: tooltipText,
              }}
            />
            <Bar dataKey="count" name="Total" fill={totalBarColor} radius={[4, 4, 0, 0]} />
            <Bar dataKey="aging_count" name="Aging" fill={agingBarColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

**Step 3: Update `vehicle-status-chart.tsx`** — same pattern with `useTheme`:
- Container: `bg-white dark:bg-zinc-900`, `border-zinc-200 dark:border-zinc-700`
- Title: `text-zinc-900 dark:text-zinc-50`
- Tooltip contentStyle: dark background + dark border
- Legend text: `text-zinc-600 dark:text-zinc-400`

**Step 4: Run tests**
```bash
cd frontend && npm test
```

**Step 5: Commit**
```
feat(dark-mode): add dark mode theming to Recharts charts using useTheme
```

---

## Task 8: Dark Mode — VehicleFilters + Pagination

**Files:**
- Modify: `frontend/src/components/vehicle-filters.tsx`
- Modify: `frontend/src/components/pagination.tsx`

**Step 1: Update `vehicle-filters.tsx`**:
- Search input: add `dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-blue-500`
- Make/Status selects: add `dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-50`
- Count text: add `dark:text-zinc-500`

**Step 2: Update `pagination.tsx`**:
- Page info text: add `dark:text-zinc-400`
- Buttons already use shadcn/ui `Button` which inherits CSS variable theming — verify they work

**Step 3: Run tests**
```bash
cd frontend && npm test -- vehicle-filters pagination
```

**Step 4: Commit**
```
feat(dark-mode): add dark mode to VehicleFilters and Pagination components
```

---

## Task 9: Mobile Dashboard Page (FR-3)

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/components/stats-card.tsx` (minor — already done in Task 6)

**Responsive changes per spec (FR-3):**

**Stats cards:**
- Already has `sm:grid-cols-2 lg:grid-cols-4` — this gives 1-col on mobile, 2-col on sm (640px+), 4-col on lg (1024px+)
- Spec asks for 2x2 on mobile — change to `grid-cols-2 lg:grid-cols-4`

**Charts:**
- Already uses `flex-col lg:flex-row` — correct for mobile stacking
- Reduce chart height on mobile: add responsive height classes

**Recent Actions (mobile card view):**
- Show table on md+ screens, card list on mobile
- Create inline mobile card component within the page (no need for a separate file)

**Step 1: Update dashboard page stats grid**:
Change `grid gap-4 sm:grid-cols-2 lg:grid-cols-4` → `grid grid-cols-2 gap-4 lg:grid-cols-4`

**Step 2: Add mobile card view for recent actions** in `frontend/src/app/page.tsx`:
```tsx
{/* Recent Actions — desktop table */}
<div className="hidden md:block rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
  {/* ... existing table code ... */}
</div>

{/* Recent Actions — mobile card list */}
<div className="md:hidden space-y-3">
  <div className="flex items-center justify-between">
    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Recent Actions</h3>
    <Link href="/aging" className="text-sm text-blue-600 hover:underline">View all →</Link>
  </div>
  {recentActions && recentActions.length > 0 ? (
    recentActions.map((action, i) => (
      <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{action.vehicle}</p>
          <ActionBadge actionType={action.actionType} />
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <span>{action.daysInStock} days in stock</span>
          <span>{new Date(action.date).toLocaleDateString()}</span>
        </div>
      </div>
    ))
  ) : (
    <p className="text-center py-6 text-zinc-400">No recent actions</p>
  )}
</div>
```

**Step 3: Add dark mode variants to dashboard page containers**:
- All `bg-white` → `bg-white dark:bg-zinc-900`
- All `border-zinc-200` → `border-zinc-200 dark:border-zinc-700`
- All `text-zinc-900` → `text-zinc-900 dark:text-zinc-50`
- All `text-zinc-500` → `text-zinc-500 dark:text-zinc-400`
- All `bg-zinc-50` (skeleton) → `bg-zinc-50 dark:bg-zinc-800`

**Step 4: Reduce chart height on mobile** — wrap chart containers with responsive height:
```tsx
<div className="h-48 md:h-64">
  <ResponsiveContainer ... />
</div>
```

**Step 5: Run tests**
```bash
cd frontend && npm test -- page.test
```

**Step 6: Commit**
```
feat(responsive,dark-mode): mobile-first dashboard page with 2x2 stats grid and action cards
```

---

## Task 10: VehicleCard Component + Mobile Inventory Page (FR-4)

**Files:**
- Create: `frontend/src/components/vehicle-card.tsx`
- Create: `frontend/src/components/__tests__/vehicle-card.test.tsx`
- Modify: `frontend/src/app/inventory/page.tsx`

**Step 1: Write the failing test** at `frontend/src/components/__tests__/vehicle-card.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VehicleCard } from "@/components/vehicle-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockVehicle = {
  id: "v1",
  make: "Toyota",
  model: "Camry",
  year: 2022,
  vin: "1HGBH41JXMN109186",
  status: "available" as const,
  price: 25000,
  days_in_stock: 45,
  is_aging: false,
  actions: [],
};

describe("VehicleCard", () => {
  it("renders vehicle make, model, year", () => {
    render(<VehicleCard vehicle={mockVehicle} onClick={() => {}} />);
    expect(screen.getByText("2022 Toyota Camry")).toBeTruthy();
  });

  it("renders VIN", () => {
    render(<VehicleCard vehicle={mockVehicle} onClick={() => {}} />);
    expect(screen.getByText("1HGBH41JXMN109186")).toBeTruthy();
  });

  it("renders days in stock", () => {
    render(<VehicleCard vehicle={mockVehicle} onClick={() => {}} />);
    expect(screen.getByText(/45/)).toBeTruthy();
  });

  it("renders price", () => {
    render(<VehicleCard vehicle={mockVehicle} onClick={() => {}} />);
    expect(screen.getByText("$25,000")).toBeTruthy();
  });

  it("calls onClick when tapped", () => {
    const onClick = vi.fn();
    render(<VehicleCard vehicle={mockVehicle} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("highlights aging vehicles with red text", () => {
    const agingVehicle = { ...mockVehicle, days_in_stock: 120, is_aging: true };
    render(<VehicleCard vehicle={agingVehicle} onClick={() => {}} />);
    const daysEl = screen.getByText(/120/);
    expect(daysEl.className).toContain("text-red");
  });
});
```

**Step 2: Run test to verify it fails**
```bash
cd frontend && npm test -- vehicle-card
```

**Step 3: Implement** `frontend/src/components/vehicle-card.tsx`:
```tsx
"use client";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import type { components } from "@/lib/api/types";

type Vehicle = components["schemas"]["Vehicle"];

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick: () => void;
}

export function VehicleCard({ vehicle, onClick }: VehicleCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </p>
          <p className="mt-0.5 font-mono text-xs text-zinc-400 dark:text-zinc-500">{vehicle.vin}</p>
        </div>
        <StatusBadge status={vehicle.status} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-zinc-500 dark:text-zinc-400">
          {vehicle.price ? `$${vehicle.price.toLocaleString()}` : "—"}
        </span>
        <span
          className={cn(
            "font-medium",
            vehicle.is_aging
              ? "text-red-600 dark:text-red-500"
              : "text-zinc-600 dark:text-zinc-400"
          )}
        >
          {vehicle.days_in_stock ?? 0} days in stock
        </span>
      </div>
    </button>
  );
}
```

**Step 4: Run test to verify it passes**
```bash
cd frontend && npm test -- vehicle-card
```

**Step 5: Update inventory page** (`frontend/src/app/inventory/page.tsx`):

**Filter bar on mobile:**
- Search input: add `w-full sm:w-60` (full-width on mobile)
- Wrap filters in a flex-wrap container that scrolls horizontally on mobile
- Add `overflow-x-auto` pill container for make/status/aging filters

**Card list vs table:**
```tsx
{/* Desktop table */}
<div className="hidden md:block rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
  <Table>...existing table...</Table>
  ...pagination...
</div>

{/* Mobile card list */}
<div className="md:hidden space-y-3">
  {isLoading ? (
    [...Array(3)].map((_, i) => (
      <div key={i} className="h-24 animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800" />
    ))
  ) : filteredItems && filteredItems.length > 0 ? (
    filteredItems.map((vehicle) => (
      <VehicleCard
        key={vehicle.id}
        vehicle={vehicle}
        onClick={() => router.push(`/vehicles/${vehicle.id}`)}
      />
    ))
  ) : (
    <p className="py-12 text-center text-zinc-400">No vehicles found</p>
  )}
  {/* Simplified mobile pagination */}
  {data && data.total_pages > 1 && (
    <div className="flex items-center justify-between pt-2">
      <button
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={page <= 1}
        className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 disabled:opacity-50"
      >
        ← Previous
      </button>
      <span className="text-sm text-zinc-500 dark:text-zinc-400">
        {page} / {data.total_pages}
      </span>
      <button
        onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
        disabled={page >= data.total_pages}
        className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 disabled:opacity-50"
      >
        Next →
      </button>
    </div>
  )}
</div>
```

**Add dark mode variants** to inventory page header, button areas, error states.

**Step 6: Run tests**
```bash
cd frontend && npm test -- vehicle-card inventory
```

**Step 7: Commit**
```
feat(responsive,dark-mode): add VehicleCard component and mobile inventory page with card list
```

---

## Task 11: AgingCard Component + Mobile Aging Page (FR-5)

**Files:**
- Create: `frontend/src/components/aging-card.tsx`
- Create: `frontend/src/components/__tests__/aging-card.test.tsx`
- Modify: `frontend/src/app/aging/page.tsx`

**Step 1: Write the failing test** at `frontend/src/components/__tests__/aging-card.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AgingCard } from "@/components/aging-card";

const mockVehicle = {
  id: "v1",
  make: "Honda",
  model: "Civic",
  year: 2021,
  vin: "2HGBH41JXMN109187",
  status: "available" as const,
  price: 22000,
  days_in_stock: 120,
  is_aging: true,
  actions: [],
};

describe("AgingCard", () => {
  it("renders vehicle info", () => {
    render(<AgingCard vehicle={mockVehicle} onLogAction={() => {}} />);
    expect(screen.getByText("2021 Honda Civic")).toBeTruthy();
  });

  it("renders VIN", () => {
    render(<AgingCard vehicle={mockVehicle} onLogAction={() => {}} />);
    expect(screen.getByText("2HGBH41JXMN109187")).toBeTruthy();
  });

  it("renders days in stock", () => {
    render(<AgingCard vehicle={mockVehicle} onLogAction={() => {}} />);
    expect(screen.getByText(/120/)).toBeTruthy();
  });

  it("renders Log Action button", () => {
    render(<AgingCard vehicle={mockVehicle} onLogAction={() => {}} />);
    expect(screen.getByRole("button", { name: /log action/i })).toBeTruthy();
  });

  it("calls onLogAction when button clicked", () => {
    const onLogAction = vi.fn();
    render(<AgingCard vehicle={mockVehicle} onLogAction={onLogAction} />);
    fireEvent.click(screen.getByRole("button", { name: /log action/i }));
    expect(onLogAction).toHaveBeenCalledWith("v1");
  });
});
```

**Step 2: Run test to verify it fails**
```bash
cd frontend && npm test -- aging-card
```

**Step 3: Implement** `frontend/src/components/aging-card.tsx`:
```tsx
"use client";

import { AgingProgressBar } from "@/components/aging-progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import type { components } from "@/lib/api/types";

type Vehicle = components["schemas"]["Vehicle"];

interface AgingCardProps {
  vehicle: Vehicle;
  onLogAction: (id: string) => void;
}

export function AgingCard({ vehicle, onLogAction }: AgingCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </p>
          <p className="mt-0.5 font-mono text-xs text-zinc-400 dark:text-zinc-500">{vehicle.vin}</p>
        </div>
        <StatusBadge status={vehicle.status} />
      </div>
      <div className="mt-3">
        <AgingProgressBar days={vehicle.days_in_stock ?? 0} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {vehicle.price ? `$${vehicle.price.toLocaleString()}` : "—"}
        </span>
        <Button
          size="sm"
          className="bg-blue-600 text-white hover:bg-blue-700 min-h-[44px]"
          onClick={() => onLogAction(vehicle.id)}
        >
          Log Action
        </Button>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**
```bash
cd frontend && npm test -- aging-card
```

**Step 5: Update aging page** (`frontend/src/app/aging/page.tsx`):

**Alert banner:** Add `dark:bg-red-950 dark:text-red-400` variants; already full-width.

**Stats cards:** Change `sm:grid-cols-3` → `grid-cols-1 sm:grid-cols-3` for single-column on mobile.

**Card list vs table:**
```tsx
{/* Desktop table */}
<div className="hidden md:block rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
  <Table>...existing...</Table>
</div>

{/* Mobile card list */}
<div className="md:hidden space-y-3">
  {isLoading ? (
    [...Array(3)].map((_, i) => (
      <div key={i} className="h-28 animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800" />
    ))
  ) : vehicles.length > 0 ? (
    vehicles.map((vehicle) => (
      <AgingCard
        key={vehicle.id}
        vehicle={vehicle}
        onLogAction={(id) => router.push(`/vehicles/${id}`)}
      />
    ))
  ) : (
    <p className="py-12 text-center text-zinc-400">No aging vehicles — great job!</p>
  )}
</div>
```

**Add dark mode** to page header, select, and all containers.

**Step 6: Run tests**
```bash
cd frontend && npm test -- aging-card aging.test
```

**Step 7: Commit**
```
feat(responsive,dark-mode): add AgingCard component and mobile aging page with card list
```

---

## Task 12: Mobile Vehicle Detail Page (FR-6)

**Files:**
- Modify: `frontend/src/app/vehicles/[id]/page.tsx`
- Modify: `frontend/src/components/vehicle-info-card.tsx`
- Modify: `frontend/src/components/action-form.tsx` (dark mode already done in Task 6)
- Modify: `frontend/src/components/action-timeline.tsx` (dark mode already done in Task 6)

**Spec requirements (FR-6):**
- Single column layout on mobile (no `lg:flex-row` until lg breakpoint)
- Action form ABOVE timeline on mobile
- Vehicle info fields stack in 2-column grid (from wider layout)
- Below 400px: single column

**Step 1: Read `vehicle-info-card.tsx`** to understand its current field layout.

**Step 2: Update vehicle detail page layout**:
```tsx
{/* Mobile: single column, form first; Desktop: two-column side-by-side */}
<div className="flex flex-col gap-6 lg:flex-row-reverse">
  {/* Action form — left in desktop (right in source order), top on mobile via flex-col */}
  <div className="lg:w-[380px]">
    <ActionForm vehicleId={vehicle.id} />
  </div>
  {/* Timeline — right in desktop, bottom on mobile */}
  <div className="flex-1">
    <ActionTimeline actions={vehicle.actions ?? []} />
  </div>
</div>
```
Note: `lg:flex-row-reverse` places `ActionForm` on the right on desktop (maintains existing behavior) and at the top on mobile (first in DOM order = first in flex-col).

**Step 3: Update `vehicle-info-card.tsx`** — add responsive field grid:
- Currently likely uses a flex row with many fields
- Change to: `grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4` or similar
- Add `dark:` variants for all colors

**Step 4: Add dark mode to back link** in vehicle detail page:
```tsx
<Link
  href="/inventory"
  className="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
>
```

**Step 5: Add dark mode to loading skeletons** in vehicle detail page:
- `bg-zinc-100` → `bg-zinc-100 dark:bg-zinc-800`
- `border-zinc-200` → `border-zinc-200 dark:border-zinc-700`
- `bg-zinc-50` → `bg-zinc-50 dark:bg-zinc-800`

**Step 6: Run tests**
```bash
cd frontend && npm test -- detail
```

**Step 7: Commit**
```
feat(responsive,dark-mode): mobile vehicle detail page with action form above timeline
```

---

## Task 13: Update System Design Doc (C4 Diagram)

**Files:**
- Modify: `docs/plans/2026-03-17-system-design.md`

This is the full C4 diagram update described in Task 0. After all components are implemented, add the new components to the L3 Frontend Component Diagram and add `ThemeProvider` to the providers description.

**New components to add in section 1.5:**
```
Component(theme_toggle, "ThemeToggle", "React, next-themes", "Cycles system/light/dark, persists to localStorage")
Component(mobile_nav, "MobileNav", "React", "Fixed hamburger button + full-height overlay sidebar on mobile")
Component(vehicle_card, "VehicleCard", "React", "Mobile card view for inventory list items — tap to navigate")
Component(aging_card, "AgingCard", "React", "Mobile card view for aging stock — includes Log Action button")
```

**New relationships:**
```
Rel(sidebar, theme_toggle, "contains")
Rel(mobile_nav, theme_toggle, "contains")
Rel(inventory_page, vehicle_card, "uses on mobile")
Rel(aging_page, aging_card, "uses on mobile")
```

**Commit:**
```
docs: update L3 frontend component diagram with dark mode + responsive components
```

---

## Task 14: Final Verification Pass

**Files:** Read-only verification — no file changes expected.

**Step 1: Run all frontend tests**
```bash
cd frontend && npm test
```
All tests must pass.

**Step 2: TypeScript check**
```bash
cd frontend && npx tsc --noEmit
```
No errors.

**Step 3: Lint**
```bash
cd frontend && npm run lint
```
No errors.

**Step 4: Manual verification checklist** (describe what to check):
- [ ] Dark mode toggle in sidebar (desktop) works and cycles system→light→dark→system
- [ ] Dark mode toggle in mobile nav works
- [ ] System preference detection works (OS dark mode triggers app dark mode)
- [ ] All components render correctly in both light and dark mode
- [ ] No flash of wrong theme on page load
- [ ] Charts adapt colors for dark mode
- [ ] Mobile (375px): sidebar hidden, hamburger visible
- [ ] Mobile: sidebar slides in as overlay on hamburger tap
- [ ] Mobile: sidebar closes on backdrop tap, X button, or navigation
- [ ] Mobile: no horizontal scroll at 375px
- [ ] Dashboard: 2x2 stats grid on mobile, 4-across on desktop
- [ ] Dashboard: charts stacked on mobile, side-by-side on desktop
- [ ] Dashboard: recent actions show cards on mobile, table on desktop
- [ ] Inventory: full-width search on mobile, scrollable filter pills
- [ ] Inventory: card list on mobile, full table on desktop
- [ ] Inventory: card tap navigates to vehicle detail
- [ ] Aging: stats stack on mobile (1 column)
- [ ] Aging: aging cards on mobile with Log Action button
- [ ] Vehicle detail: single column on mobile, action form above timeline
- [ ] Touch targets >= 44px on mobile (hamburger, Log Action, etc.)

**Step 5: Commit final verification**
```
chore: final verification — all dark mode and responsive tests passing
```

---

## Progress File

Will be initialized at: `docs/reports/2026-03-18-dark-mode-responsive-progress.md`

---

## Summary of Files Changed

### New Files
- `frontend/src/components/theme-toggle.tsx`
- `frontend/src/components/mobile-nav.tsx`
- `frontend/src/components/vehicle-card.tsx`
- `frontend/src/components/aging-card.tsx`
- `frontend/src/components/__tests__/theme-toggle.test.tsx`
- `frontend/src/components/__tests__/mobile-nav.test.tsx`
- `frontend/src/components/__tests__/vehicle-card.test.tsx`
- `frontend/src/components/__tests__/aging-card.test.tsx`

### Modified Files
- `frontend/package.json` (add next-themes)
- `frontend/src/lib/providers.tsx` (add ThemeProvider)
- `frontend/src/app/layout.tsx` (add suppressHydrationWarning, MobileNav, responsive main)
- `frontend/src/app/globals.css` (update dark CSS variables)
- `frontend/tailwind.config.ts` (already has darkMode: ["class"] — verify only)
- `frontend/src/components/sidebar.tsx` (hide on mobile, add ThemeToggle)
- `frontend/src/components/stats-card.tsx` (dark mode variants)
- `frontend/src/components/status-badge.tsx` (dark mode variants)
- `frontend/src/components/action-badge.tsx` (dark mode variants)
- `frontend/src/components/aging-progress-bar.tsx` (dark mode variants)
- `frontend/src/components/vehicle-info-card.tsx` (dark mode + responsive grid)
- `frontend/src/components/action-timeline.tsx` (dark mode variants)
- `frontend/src/components/action-form.tsx` (dark mode variants)
- `frontend/src/components/add-vehicle-modal.tsx` (dark mode variants)
- `frontend/src/components/vehicle-filters.tsx` (dark mode + mobile full-width search)
- `frontend/src/components/pagination.tsx` (dark mode variants)
- `frontend/src/components/ui/table.tsx` (dark mode variants)
- `frontend/src/components/charts/inventory-by-make-chart.tsx` (dark mode via useTheme)
- `frontend/src/components/charts/vehicle-status-chart.tsx` (dark mode via useTheme)
- `frontend/src/app/page.tsx` (mobile responsive + dark mode)
- `frontend/src/app/inventory/page.tsx` (mobile responsive + dark mode)
- `frontend/src/app/aging/page.tsx` (mobile responsive + dark mode)
- `frontend/src/app/vehicles/[id]/page.tsx` (mobile responsive + dark mode)
- `docs/plans/2026-03-17-system-design.md` (C4 diagram updates)
