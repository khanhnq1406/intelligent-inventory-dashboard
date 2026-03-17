# Frontend Pages & Components Specification

## Summary

Implement all four frontend pages of the Intelligent Inventory Dashboard — Dashboard Home, Vehicle Inventory, Aging Stock, and Vehicle Detail — matching the V2 designs from the `.pen` design files. This includes replacing the current top navigation with a dark icon-only sidebar, creating TanStack Query hooks for all API endpoints, building reusable feature components, and integrating Recharts for dashboard visualizations.

## User Stories

- As a dealership manager, I want to see a dashboard overview with total vehicles, aging count, average days in stock, and recent actions so I can quickly assess inventory health.
- As a dealership manager, I want to browse, search, and filter my complete vehicle inventory so I can find specific vehicles.
- As a dealership manager, I want a dedicated aging stock view that highlights vehicles over 90 days so I can take corrective action.
- As a dealership manager, I want to view vehicle details with full action history and log new actions so I can track interventions on aging vehicles.

## Functional Requirements

### FR-1: Sidebar Navigation

Replace the existing horizontal top navigation with a 64px-wide dark (#09090B) icon-only sidebar.

**Design specs:**
- Width: 64px, full viewport height, fixed left
- Background: #09090B (near-black)
- Logo: "IV" text in blue (#2563EB) rounded square at top
- Nav icons: Dashboard (LayoutDashboard), Inventory (Car), Aging Stock (Clock)
- Active state: darker background (#27272A), icon highlighted
- Icons from Lucide React, 20x20px, centered in 40x40px hit area

**Acceptance criteria:**
- [ ] Sidebar renders on all pages, fixed to left
- [ ] Active route icon is highlighted
- [ ] Main content shifts right to accommodate sidebar (64px left offset)
- [ ] Responsive: sidebar remains visible on desktop (≥1024px)

### FR-2: Dashboard Home Page (/)

Display summary statistics, inventory-by-make bar chart, vehicle status donut chart, and recent actions table.

**Design specs — Stats Row (4 cards):**
- Cards: Total Vehicles, Aging Stock (red value), Avg. Days in Stock, Actions This Month
- Card: rounded-xl (12px), 1px border ($border-default), padding 20px
- Title: Inter 12px, $text-secondary | Value: Inter 32px bold, $text-primary (or $danger for aging)
- Change indicator: green up arrow or red down arrow with percentage text, Inter 12px

**Design specs — Charts Row:**
- Left: "Inventory by Make" bar chart with header + "Last 30 days" dropdown
- Right: "Vehicle Status" donut chart (380px fixed width) with legend (Available=blue, Sold=gray, Reserved=amber, Aging=red)
- Both in bordered cards, rounded-xl, padding 24px

**Design specs — Recent Actions Table:**
- Header: "Recent Actions" + "View all →" link
- Columns: Vehicle, Action, Days in Stock, Date
- 3 rows visible, action type shown as colored badge
- Table in bordered card, rounded-xl

**Acceptance criteria:**
- [ ] Stats cards show live data from `GET /api/v1/dashboard/summary`
- [ ] Bar chart renders inventory counts by make using Recharts
- [ ] Donut chart renders vehicle status breakdown using Recharts
- [ ] Recent actions table shows latest 3 actions (derived from vehicles data)
- [ ] Loading skeleton shown while data fetches
- [ ] Error state handled gracefully

### FR-3: Vehicle Inventory Page (/inventory)

Filterable, sortable, paginated vehicle table.

**Design specs — Header:**
- Title: "Vehicle Inventory" Inter 28px bold
- Subtitle: "Manage and filter your complete vehicle stock" Inter 14px, $text-secondary
- Right: Export button (outline, disabled placeholder) + Add Vehicle button (blue, disabled placeholder)

**Design specs — Filter Bar:**
- Search input (240px): "Search by VIN, make, model..." with search icon
- Dropdowns: Make, Model, Status (each with chevron-down icon)
- Aging Only toggle: red badge-style button with triangle-alert icon
- Count text: "Showing X vehicles" in $text-tertiary

**Design specs — Data Table:**
- Columns: VIN (160px), Make (fill), Model (fill), Year (60px), Price (100px), Status (90px), Days (80px), Last Action (120px)
- Header row: $bg-tertiary background, Inter 12px $text-tertiary uppercase
- Data rows: Inter 13px, padding 12px 16px, bottom border
- Status column: colored badge (Available=blue/bg-highlight, Aging=red/danger-light, Sold=red)
- Days column: shows day count, red text+bg for aging (>90 days)
- Clickable rows → navigate to /vehicles/[id]

**Design specs — Pagination:**
- Bottom row: "Page X of Y" left, pagination buttons right
- Buttons: Previous (disabled when page 1), page numbers, Next
- Active page: blue background

**Acceptance criteria:**
- [ ] Table fetches data from `GET /api/v1/vehicles` with query params
- [ ] Search input filters by VIN/make/model (debounced 300ms)
- [ ] Make/Model/Status dropdowns filter the list
- [ ] "Aging Only" toggle sets `aging=true` filter
- [ ] Column headers clickable for sorting (sort_by + order params)
- [ ] Pagination controls navigate pages
- [ ] Row click navigates to vehicle detail page
- [ ] Loading skeleton for table body
- [ ] "Add Vehicle" button present but disabled with tooltip

### FR-4: Aging Stock Page (/aging)

Pre-filtered view of vehicles over 90 days with alert banner and inline actions.

**Design specs — Header:**
- Title: "Aging Stock" Inter 28px bold
- Subtitle: "All vehicles in inventory for more than 90 days" Inter 14px
- Right: Sort by dropdown ("Days in Stock")

**Design specs — Alert Banner:**
- Red-tinted background ($danger-light), rounded-lg (10px), padding 14px 16px
- Left: red circle with white triangle-alert icon
- Text: "X vehicles require attention" (bold red) + description text

**Design specs — Stats Row (3 cards):**
- Total Aging Vehicles (red value), Avg. Days in Stock, Actions Taken (green value)
- Same card style as dashboard but slightly smaller (padding 16px, 28px font)

**Design specs — Aging Table:**
- Columns: Vehicle (fill, two-line: name + VIN), Days in Stock (100px, with progress bar), Price (100px), Status (90px), Last Action (140px), Quick Action (120px)
- Days column: colored progress bar (red >120, orange 90-120) + "X days" text
- Quick Action column: blue "Log Action" button per row → navigates to vehicle detail

**Acceptance criteria:**
- [ ] Page fetches `GET /api/v1/vehicles?aging=true`
- [ ] Alert banner shows count of aging vehicles dynamically
- [ ] Stats cards show aging-specific metrics
- [ ] Table shows vehicles with days in stock progress indicator
- [ ] "Log Action" button navigates to /vehicles/[id] (or opens action form)
- [ ] Sort dropdown works (sort_by parameter)

### FR-5: Vehicle Detail Page (/vehicles/[id])

Full vehicle info, action history timeline, and log action form.

**Design specs — Back Navigation:**
- "← Back to Inventory" link at top, Inter 13px, $text-secondary

**Design specs — Vehicle Info Card:**
- Title: "2023 Toyota Camry" Inter 24px bold + aging badge (red, rounded pill)
- VIN text below title, Inter 13px $text-tertiary
- 7 field row: Make, Model, Year, Price, Status (badge), Stocked date, Dealership
- Each field: label (Inter 11px $text-tertiary) + value (Inter 14px $text-primary)
- Card: rounded-xl, 1px border, padding 24px

**Design specs — Two-Column Layout:**
- Left: Action History (fill width)
- Right: Log Action Form (380px fixed)
- Gap: 24px

**Design specs — Action History Timeline:**
- Vertical timeline with colored dots and connecting lines
- Each entry: dot (12px circle, blue for latest, gray for older) + vertical line (2px)
- Content: action type badge + date + notes text + "By: Name"
- Badge colors: Price Reduction=blue, Marketing Campaign=yellow, Transfer=green, Auction=orange

**Design specs — Log Action Form:**
- Card: rounded-xl, 1px border, padding 24px, 380px width
- Title: "Log New Action" Inter 18px bold
- Fields: Action Type (select dropdown), Notes (textarea 100px height), Your Name (text input)
- Submit button: full-width blue with send icon
- Available action types shown as gray pills below form

**Acceptance criteria:**
- [ ] Page fetches `GET /api/v1/vehicles/{id}` (includes actions)
- [ ] Vehicle info card shows all fields from API response
- [ ] Aging badge shown only when `is_aging` is true
- [ ] Action history timeline renders all actions chronologically
- [ ] Action type badges have appropriate colors
- [ ] Form submits via `POST /api/v1/vehicles/{id}/actions`
- [ ] Form validates required fields (action_type, created_by)
- [ ] After successful submit, action list refreshes (TanStack Query invalidation)
- [ ] Loading states for vehicle data and form submission
- [ ] Back button navigates to /inventory

### FR-6: TanStack Query Hooks

Create reusable hooks in `frontend/src/hooks/` for all API calls.

**Hooks to create:**
- `useDashboardSummary()` — GET /api/v1/dashboard/summary
- `useVehicles(params)` — GET /api/v1/vehicles with filter/sort/pagination params
- `useVehicle(id)` — GET /api/v1/vehicles/{id}
- `useCreateVehicleAction(vehicleId)` — POST mutation for /api/v1/vehicles/{id}/actions

**Acceptance criteria:**
- [ ] All hooks use generated TypeScript types from `lib/api/types.ts`
- [ ] All hooks use `apiFetch` from `lib/api/client.ts`
- [ ] Query keys are structured and consistent
- [ ] `useCreateVehicleAction` invalidates vehicle detail + vehicles list on success
- [ ] Error handling returns typed error responses

## Non-Functional Requirements

- **Performance**: No async fetch waterfalls — parallel data loading where possible. Dynamic import for Recharts (heavy library). TanStack Query cache with 30s staleTime (already configured).
- **Accessibility**: All interactive elements keyboard navigable. Proper ARIA labels on icon-only buttons. Color not sole indicator (icons + text alongside color badges). Focus-visible rings on interactive elements.
- **Responsive**: Desktop-first matching designs (1440px). Content area fluid-width with max constraints. Sidebar always visible on desktop.

## Architecture Changes (C4)

### Diagrams to Update
- **L3 Frontend Component diagram** in system design doc: Add new feature components (Sidebar, StatsCard, VehicleTable, AgingTable, ActionTimeline, ActionForm, charts) and hooks layer.

### New Diagrams
None required — all changes are within the existing Next.js frontend container.

## Runtime Flow Diagrams

### Flow Diagrams to Update
None — existing read/write flows already documented.

### New Flow Diagrams
- **Dashboard data loading flow**: Parallel fetch of summary + recent actions
- **Vehicle list filter/sort/paginate flow**: URL params → TanStack Query → API → render
- **Create action flow**: Form submit → mutation → cache invalidation → timeline refresh

## Data Model Changes

None — all required data models already exist in the API.

## API Changes

None — all required endpoints already exist:
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/vehicles` (with filters)
- `GET /api/v1/vehicles/{id}`
- `GET /api/v1/vehicles/{id}/actions`
- `POST /api/v1/vehicles/{id}/actions`

## UI/UX Changes

### Existing Component Inventory (REQUIRED)

| Need | Existing Component | Location |
|------|--------------------|----------|
| Button variants | Button (shadcn) | `components/ui/button.tsx` |
| Card containers | Card (shadcn) | `components/ui/card.tsx` |
| Status badges | Badge (shadcn) | `components/ui/badge.tsx` |
| Table primitives | Table (shadcn) | `components/ui/table.tsx` |
| Utility cn() | cn | `lib/utils.ts` |
| API client | apiFetch | `lib/api/client.ts` |
| Icons | lucide-react | Package installed |

### New Components

| Component | Location | Justification |
|-----------|----------|---------------|
| Sidebar | `components/sidebar.tsx` | Replaces top nav, icon-only vertical navigation |
| StatsCard | `components/stats-card.tsx` | Reusable stat card used on Dashboard + Aging pages |
| InventoryByMakeChart | `components/charts/inventory-by-make-chart.tsx` | Recharts bar chart, Dashboard only |
| VehicleStatusChart | `components/charts/vehicle-status-chart.tsx` | Recharts donut chart, Dashboard only |
| VehicleTable | `components/vehicle-table.tsx` | Data table for Inventory page |
| VehicleFilters | `components/vehicle-filters.tsx` | Search + filter bar for Inventory page |
| AgingTable | `components/aging-table.tsx` | Specialized table for Aging Stock page |
| AgingProgressBar | `components/aging-progress-bar.tsx` | Days-in-stock colored progress indicator |
| ActionTimeline | `components/action-timeline.tsx` | Vertical timeline for Vehicle Detail |
| ActionForm | `components/action-form.tsx` | Log new action form for Vehicle Detail |
| VehicleInfoCard | `components/vehicle-info-card.tsx` | Vehicle detail header card |
| Pagination | `components/pagination.tsx` | Reusable page navigation control |
| ActionBadge | `components/action-badge.tsx` | Colored badge for action types |
| StatusBadge | `components/status-badge.tsx` | Colored badge for vehicle status |

### New Hooks

| Hook | Location | Purpose |
|------|----------|---------|
| useDashboardSummary | `hooks/use-dashboard-summary.ts` | Fetch dashboard stats |
| useVehicles | `hooks/use-vehicles.ts` | Fetch vehicle list with filters |
| useVehicle | `hooks/use-vehicle.ts` | Fetch single vehicle detail |
| useCreateVehicleAction | `hooks/use-create-vehicle-action.ts` | Mutation: create vehicle action |

## Design Tokens (from .pen variables)

| Token | Value | Tailwind Mapping |
|-------|-------|-----------------|
| $text-primary | #18181B | zinc-900 |
| $text-secondary | #71717A | zinc-500 |
| $text-tertiary | #A1A1AA | zinc-400 |
| $bg-primary | #FFFFFF | white |
| $bg-secondary | #F4F4F5 | zinc-100 |
| $bg-tertiary | #F4F4F5 | zinc-100 |
| $border-default | #E4E4E7 | zinc-200 |
| $accent-blue | #2563EB | blue-600 |
| $bg-highlight | #EFF6FF | blue-50 |
| $danger | #DC2626 | red-600 |
| $danger-light | #FEE2E2 | red-100 |
| $success | #16A34A | green-600 |
| $success-light | #DCFCE7 | green-100 |
| $warning | #F59E0B | amber-500 |
| $warning-light | #FEF3C7 | amber-100 |
| Sidebar bg | #09090B | zinc-950 |
| Sidebar active | #27272A | zinc-800 |

## Security & Risk Assessment

### Data Flow Diagram

| # | Source | Data | Trust Boundary Crossed? | Destination | Notes |
|---|--------|------|------------------------|-------------|-------|
| 1 | Browser | Filter params (make, model, status, page) | No (client-side) | TanStack Query | URL search params |
| 2 | TanStack Query | HTTP GET with query params | Yes: Browser → API | Go backend | Params validated by oapi-codegen |
| 3 | Go backend | JSON response (vehicle data) | Yes: API → Browser | TanStack Query cache | Rendered as text, not innerHTML |
| 4 | Browser | Form input (action_type, notes, created_by) | No (client-side) | React state | Client-side validation |
| 5 | React state | POST JSON body | Yes: Browser → API | Go backend | Body validated by oapi-codegen |
| 6 | Go backend | Created action JSON | Yes: API → Browser | TanStack Query cache | Invalidates related queries |

### Trust Boundaries

| Boundary | Crossed By | Security Control |
|----------|-----------|-----------------|
| Browser → API | All data fetches and form submissions | oapi-codegen validates all inputs server-side |
| API → Browser | All API responses | React renders as text (no dangerouslySetInnerHTML) |

### Threats Identified (STRIDE per boundary crossing)

| # | Data Flow | Boundary | STRIDE | Threat | Severity | Mitigation |
|---|-----------|----------|--------|--------|----------|------------|
| T-1 | 2 | Browser → API | Tampering | User manipulates query params (e.g., page_size=999999) | Low | Server enforces max page_size=100 via OpenAPI constraint |
| T-2 | 5 | Browser → API | Tampering | User submits malformed action (XSS in notes field) | Medium | Server-side validation + React text rendering (no innerHTML) |
| T-3 | 3,6 | API → Browser | Information Disclosure | API response contains data from other dealerships | Medium | Service layer enforces dealership-scoped queries (future auth) |
| T-4 | 2 | Browser → API | Denial of Service | Rapid filter changes cause excessive API calls | Low | Debounced search input (300ms), TanStack Query deduplication |

### Authorization Rules

- No auth in v1 (out of scope per system design)
- All data currently accessible without credentials
- Future: dealership-scoped JWT tokens

### Input Validation Rules

- **Client-side** (UX only, not security): Required fields on action form (action_type, created_by), debounced search
- **Server-side** (security): oapi-codegen validates all inputs — enum values, string lengths, UUID formats, pagination limits

### Sensitive Data Handling

- No sensitive data displayed (no PII beyond names in action logs)
- VIN numbers displayed — not considered sensitive for dealership context

### Issues & Risks Summary

1. No authentication in v1 — all data publicly accessible. Acceptable per system design scope.
2. Notes field accepts free text — rendered safely via React's default text escaping.
3. Chart data derived from summary endpoint — no direct database query from frontend.

## Edge Cases & Error Handling

| Scenario | Handling |
|----------|---------|
| API returns 500 | Show error message with retry button |
| Empty vehicle list | Show "No vehicles found" empty state |
| No aging vehicles | Show "No aging vehicles" with success message |
| Vehicle not found (404) | Redirect to /inventory with toast notification |
| Form submission fails | Show inline error, keep form state |
| Network offline | TanStack Query shows stale data if cached, error if not |
| Very long vehicle name/notes | Text truncation with ellipsis in tables, full text in detail view |

## Dependencies & Assumptions

- **Dependencies**: Recharts (new npm dependency), all other deps already installed
- **Assumptions**: Backend API is running and seeded with test data. All 7 API endpoints return data matching the OpenAPI spec. CORS is configured for localhost:3000 → localhost:8080.

## Out of Scope

- Authentication / authorization
- Dark mode implementation
- Mobile responsive layout (< 1024px)
- Export functionality
- Add Vehicle functionality (button shown but disabled)
- Real-time updates (WebSocket)
- Vehicle image uploads
- Dealership selection/switching
