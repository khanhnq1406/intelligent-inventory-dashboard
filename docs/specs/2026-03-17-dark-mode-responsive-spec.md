# Dark Mode & Mobile Responsive Specification

## Summary

Implement system-preference-aware dark mode with a manual toggle using `next-themes`, and redesign all pages with a mobile-first responsive approach — collapsible sidebar with hamburger menu, card-based views on small screens instead of tables, and touch-friendly UI across all breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px).

## User Stories

- As a dealership manager working late, I want to switch to dark mode so that the dashboard is easier on my eyes in low-light conditions.
- As a dealership manager on the go, I want to view and manage inventory from my phone so that I can take action from the lot or at auctions.
- As a dealership manager using a tablet, I want the dashboard to adapt to my screen size so that I can use it alongside other tools.

## Functional Requirements

### FR-1: Dark Mode with next-themes

**Setup:**
- Install `next-themes` package
- Add `ThemeProvider` wrapping the app in `providers.tsx`
- Configure: `attribute="class"`, `defaultTheme="system"`, `enableSystem=true`
- Add `suppressHydrationWarning` to `<html>` element

**Theme toggle:**
- Location: Bottom of sidebar (above any future settings)
- Icon: Sun (light mode) / Moon (dark mode) / Monitor (system mode)
- Click cycles: system → light → dark → system
- Tooltip shows current mode name

**Color scheme:**

| Token | Light | Dark |
|-------|-------|------|
| Background primary | white | zinc-950 (#09090B) |
| Background secondary | zinc-50 (#FAFAFA) | zinc-900 (#18181B) |
| Background tertiary | zinc-100 (#F4F4F5) | zinc-800 (#27272A) |
| Text primary | zinc-900 (#18181B) | zinc-50 (#FAFAFA) |
| Text secondary | zinc-500 (#71717A) | zinc-400 (#A1A1AA) |
| Text tertiary | zinc-400 (#A1A1AA) | zinc-500 (#71717A) |
| Border default | zinc-200 (#E4E4E7) | zinc-700 (#3F3F46) |
| Card background | white | zinc-900 |
| Sidebar background | zinc-950 | zinc-950 (unchanged) |
| Sidebar active | zinc-800 | zinc-800 (unchanged) |
| Accent blue | blue-600 | blue-500 |
| Danger | red-600 | red-500 |
| Success | green-600 | green-500 |
| Warning | amber-500 | amber-400 |

**Implementation approach:**
- Use Tailwind's `dark:` variant prefix throughout
- Update `tailwind.config.ts`: `darkMode: "class"`
- Update CSS variables in `globals.css` for dark mode
- All existing components get dark mode class variants

**Acceptance criteria:**
- [ ] Dark mode toggle in sidebar
- [ ] System preference detection (OS dark mode → app dark mode)
- [ ] Manual override persists across sessions (localStorage)
- [ ] All components render correctly in both modes
- [ ] No flash of wrong theme on page load (SSR-safe)
- [ ] Charts (Recharts) adapt colors for dark mode
- [ ] No hardcoded colors — all use Tailwind theme tokens or CSS variables

### FR-2: Collapsible Sidebar for Mobile

**Behavior by breakpoint:**

| Breakpoint | Sidebar Behavior |
|-----------|-----------------|
| < 768px (mobile) | Hidden by default. Hamburger icon (top-left) opens as overlay. Tap outside or X closes. |
| 768px-1023px (tablet) | Collapsed to icon-only (current 64px width). Tap to expand as overlay. |
| >= 1024px (desktop) | Always visible, fixed (current behavior) |

**Mobile sidebar overlay:**
- Full-height overlay from left, width 240px
- Semi-transparent backdrop (click to close)
- Shows logo, nav items with labels (not icon-only), theme toggle
- Smooth slide-in/out animation (200ms)
- Closes on navigation (route change)

**Hamburger button (mobile only):**
- Position: fixed top-left, 44x44px touch target
- Icon: Menu (hamburger) → X (when open)
- z-index above page content

**Acceptance criteria:**
- [ ] Mobile: sidebar hidden, hamburger visible
- [ ] Mobile: sidebar slides in as overlay on hamburger tap
- [ ] Mobile: sidebar closes on backdrop tap, X button, or navigation
- [ ] Tablet: icon-only sidebar visible, expands on tap
- [ ] Desktop: full sidebar always visible (no change)
- [ ] Smooth animations, no layout shift
- [ ] Touch targets >= 44px on mobile

### FR-3: Mobile-First Dashboard Page

**Stats cards (mobile):**
- Stack 2x2 grid on mobile (2 columns)
- Full-width single column below 375px

**Charts (mobile):**
- Stack vertically (full width each)
- Chart height reduced to 200px on mobile (from ~300px)
- Vehicle Status chart: horizontal legend below chart

**Recent actions (mobile):**
- Card-based layout instead of table
- Each action as a card: Vehicle name, action badge, date, days

**Acceptance criteria:**
- [ ] Stats: 2x2 on mobile, 4-across on desktop
- [ ] Charts: stacked on mobile, side-by-side on desktop
- [ ] Recent actions: cards on mobile, table on desktop
- [ ] No horizontal scroll at 375px width

### FR-4: Mobile-First Inventory Page

**Filter bar (mobile):**
- Search input: full width
- Filters: horizontal scrollable row (pill-style buttons)
- Or: collapsible filter section with "Filters" toggle button

**Vehicle table (mobile):**
- Replace table with card list on screens < 768px
- Each card shows: Make/Model/Year (title), VIN, Status badge, Price, Days in stock
- Cards are tappable → navigate to detail
- Pagination: simplified prev/next with page indicator

**Acceptance criteria:**
- [ ] Filters: full-width search, scrollable filter pills on mobile
- [ ] Table: card list on mobile, full table on desktop
- [ ] Card tap navigates to vehicle detail
- [ ] Pagination simplified on mobile
- [ ] No horizontal scroll

### FR-5: Mobile-First Aging Page

**Alert banner (mobile):**
- Full-width, text wraps naturally
- Reduced padding on mobile

**Stats cards (mobile):**
- 1 column on mobile (stacked vertically)
- 3 columns on desktop (current)

**Aging table (mobile):**
- Card-based layout with: Vehicle name/VIN, progress bar, days count, "Log Action" button
- Progress bar full width inside card

**Acceptance criteria:**
- [ ] Alert banner readable on mobile
- [ ] Stats stack on mobile
- [ ] Cards instead of table on mobile
- [ ] "Log Action" button accessible on mobile

### FR-6: Mobile-First Vehicle Detail Page

**Layout (mobile):**
- Single column (no side-by-side)
- Order: Vehicle info card → Action form → Action timeline
- Action form moves above timeline on mobile (more important action)

**Vehicle info card (mobile):**
- Fields stack in 2-column grid (from 7-field row)
- Below 400px: single column

**Action timeline (mobile):**
- Full width, same design but with more compact spacing

**Acceptance criteria:**
- [ ] Single column layout on mobile
- [ ] Action form above timeline on mobile
- [ ] Info card fields stack properly
- [ ] All content readable at 375px

## Non-Functional Requirements

- **Performance**: Dark mode switch is instant (no re-render flash). Theme preference loaded before first paint.
- **Accessibility**: Color contrast ratios meet WCAG 2.1 AA in both themes. Touch targets >= 44px on mobile. Focus-visible rings on all interactive elements.
- **Animation**: Sidebar transitions complete in < 200ms. No animation on reduced-motion preference (`prefers-reduced-motion: reduce`).

## Architecture Changes (C4)

### Diagrams to Update
- **L3 Frontend Component diagram**: Add ThemeProvider, ThemeToggle, MobileSidebar, and responsive wrapper components.

### New Diagrams
None.

## Runtime Flow Diagrams

None needed — these are purely UI/UX changes with no new API calls or business logic.

## Data Model Changes

None.

## API Changes

None.

## UI/UX Changes

### Existing Component Inventory (REQUIRED)

| Need | Existing Component | Location |
|------|--------------------|----------|
| Sidebar | Sidebar | `components/sidebar.tsx` (to be modified) |
| All page layouts | Pages in `app/` | To be modified for responsive |
| Stats cards | StatsCard | `components/stats-card.tsx` (add dark mode) |
| Charts | InventoryByMakeChart, VehicleStatusChart | `components/charts/` (add dark mode) |
| Badges | StatusBadge, ActionBadge | `components/` (add dark mode) |
| Table | Table (shadcn) | `components/ui/table.tsx` (add dark mode) |
| Pagination | Pagination | `components/pagination.tsx` (add responsive) |
| Vehicle filters | VehicleFilters | `components/vehicle-filters.tsx` (add responsive) |

### New Components

| Component | Location | Justification |
|-----------|----------|---------------|
| ThemeToggle | `components/theme-toggle.tsx` | Toggle button cycling system/light/dark. No existing theme component. |
| MobileNav | `components/mobile-nav.tsx` | Mobile hamburger button + overlay sidebar. Different UX pattern from desktop sidebar. |
| VehicleCard | `components/vehicle-card.tsx` | Mobile-specific card view for vehicle list items. Tables don't work on small screens. |
| AgingCard | `components/aging-card.tsx` | Mobile-specific card view for aging list items. |

## Security & Risk Assessment

### Data Flow Diagram

No new data flows — all changes are client-side UI only.

### Threats Identified

| # | Threat | Severity | Mitigation |
|---|--------|----------|------------|
| T-1 | Theme preference stored in localStorage could be tampered | Negligible | Only affects visual theme, no security impact |
| T-2 | Mobile overlay could obscure security-relevant UI | Low | Overlay closes on navigation; main content always accessible |

### Issues & Risks Summary

1. Dark mode requires updating every component — risk of missed elements with incorrect colors.
2. Card-based mobile views need new components that must stay in sync with table views.
3. Chart dark mode requires Recharts color configuration — may need custom theme hook.

## Edge Cases & Error Handling

| Scenario | Handling |
|----------|---------|
| System theme changes while app is open | `next-themes` handles this automatically |
| JavaScript disabled | Falls back to light mode (SSR default) |
| Very narrow screen (< 320px) | Minimum supported width is 320px; below that, horizontal scroll allowed |
| Landscape mobile | Content reflows naturally; sidebar behaves as portrait mobile |
| Theme flash on SSR | `suppressHydrationWarning` on html + next-themes script prevents flash |

## Dependencies & Assumptions

- **New dependencies**: `next-themes` (theme management)
- **Assumptions**: Tailwind `dark:` variant works with class-based dark mode. All existing components use Tailwind utilities (not hardcoded hex colors).

## Out of Scope

- Custom theme creation (only system/light/dark)
- Per-page theme overrides
- High contrast mode
- Print stylesheet
- Offline/PWA support
