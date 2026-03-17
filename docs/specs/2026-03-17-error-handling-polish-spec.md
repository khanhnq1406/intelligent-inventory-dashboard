# Error Handling & Polish Specification

## Summary

Add production-readiness polish to the frontend: Next.js error boundaries for graceful crash recovery, a custom 404 page, an improved API client with typed errors and retry logic, dynamic filter dropdowns (make list from API), accessibility improvements (ARIA labels, keyboard navigation, focus management), and loading skeleton consistency across all pages.

## User Stories

- As a dealership manager, I want the app to recover gracefully from errors so that I don't lose my place or have to reload the entire page.
- As a dealership manager navigating to a wrong URL, I want to see a helpful 404 page so that I can find my way back to the dashboard.
- As a dealership manager, I want the make filter dropdown to show only makes that exist in my inventory so that I don't filter by a make with no results.
- As a dealership manager with accessibility needs, I want all interactive elements to be keyboard-navigable and properly labeled so that I can use the dashboard with assistive technology.

## Functional Requirements

### FR-1: Next.js Error Boundaries

Add error boundary files at the app level and per-route.

**Files to create:**

| File | Purpose |
|------|---------|
| `app/error.tsx` | Global error boundary — catches unhandled errors in any page |
| `app/not-found.tsx` | Global 404 page |
| `app/inventory/error.tsx` | Inventory page error boundary |
| `app/aging/error.tsx` | Aging page error boundary |
| `app/vehicles/[id]/error.tsx` | Vehicle detail error boundary |

**Error boundary UI:**
- Error icon (AlertTriangle from Lucide)
- Title: "Something went wrong"
- Description: User-friendly message (no technical details)
- "Try Again" button that calls `reset()` from Next.js error boundary
- "Go to Dashboard" link as fallback
- No internal error details exposed (logged to console only)

**404 page UI:**
- Large "404" text
- "Page not found" title
- "The page you're looking for doesn't exist or has been moved."
- "Back to Dashboard" button

**Acceptance criteria:**
- [ ] `app/error.tsx` catches runtime errors globally
- [ ] `app/not-found.tsx` renders for unknown routes
- [ ] Per-route error boundaries catch page-specific errors
- [ ] "Try Again" button re-renders the component
- [ ] No internal error details visible to users
- [ ] Error boundaries are `"use client"` components (Next.js requirement)

### FR-2: Improved API Client

Enhance `lib/api/client.ts` with typed errors, retry logic, and better error extraction.

**Improvements:**

| Feature | Current | New |
|---------|---------|-----|
| Error type | Generic `Error` | Typed `ApiError` with status, code, message |
| Error details | `"API error: ${status}"` | Extracts `ErrorResponse` body from backend |
| Retry | None | 1 retry on 5xx errors with 1s delay |
| Timeout | None | 30s timeout using `AbortController` |
| Network errors | Uncaught | Caught and wrapped as `ApiError` with `status: 0` |

**`ApiError` class:**
```typescript
class ApiError extends Error {
  status: number;    // HTTP status code (0 for network errors)
  code: string;      // Error code from backend or 'NETWORK_ERROR' / 'TIMEOUT'
  details?: string;  // Backend error message
}
```

**Retry logic:**
- Only retry on 5xx status codes
- Max 1 retry
- 1 second delay between retries
- Do NOT retry on 4xx (client errors)
- Do NOT retry POST/PUT/DELETE (only idempotent methods)

**Acceptance criteria:**
- [ ] `ApiError` class with status, code, details
- [ ] Backend error response body extracted into `ApiError.details`
- [ ] 5xx errors retried once with 1s delay
- [ ] 30s timeout on all requests
- [ ] Network errors caught and wrapped
- [ ] POST/mutation requests never retried
- [ ] All existing hooks work without changes (same `apiFetch` interface)

### FR-3: Dynamic Filter Dropdowns

Replace hardcoded make list with data from the dashboard summary API.

**Current state:**
- `vehicle-filters.tsx` has hardcoded makes: `["Toyota", "Honda", "BMW", "Mercedes-Benz", "Audi", "Ford", "Chevrolet"]`

**New approach:**
- Extract unique makes from `DashboardSummary.by_make[].make` (already fetched on dashboard)
- Create a new hook `useMakes()` that derives makes from `useDashboardSummary()` data
- Or: pass makes as prop from parent pages that already have the summary data
- Fallback: show "All Makes" option only if summary hasn't loaded yet

**Model filter:**
- Currently not implemented (only Make dropdown exists)
- Skip model filtering — leave as out of scope to keep this focused

**Acceptance criteria:**
- [ ] Make dropdown shows makes from actual inventory data
- [ ] "All Makes" always available as first option
- [ ] Makes update when inventory changes (cache invalidation)
- [ ] Loading state: dropdown disabled or shows "Loading..." while fetching
- [ ] Empty inventory: dropdown shows only "All Makes"

### FR-4: Accessibility Improvements

Add ARIA labels, keyboard navigation, and focus management.

**ARIA labels to add:**

| Element | ARIA Attribute | Value |
|---------|---------------|-------|
| Sidebar nav | `role="navigation"`, `aria-label` | "Main navigation" |
| Sidebar links | `aria-current="page"` | On active route |
| Search input | `aria-label` | "Search vehicles by VIN, make, or model" |
| Filter dropdowns | `aria-label` | "Filter by make", "Filter by status" |
| Stats cards | `role="status"`, `aria-label` | "Total vehicles: 150" (dynamic) |
| Aging toggle | `aria-pressed` | true/false |
| Data tables | `aria-label` | "Vehicle inventory", "Aging stock vehicles" |
| Pagination | `nav` + `aria-label` | "Pagination" |
| Modal dialog | `role="dialog"`, `aria-modal`, `aria-labelledby` | Dialog title |
| Form fields | `aria-required`, `aria-invalid`, `aria-describedby` | Error messages |
| Toast/alerts | `role="alert"`, `aria-live="polite"` | Dynamic content |

**Keyboard navigation:**

| Action | Key | Context |
|--------|-----|---------|
| Navigate sidebar | Arrow keys | When sidebar focused |
| Open modal | Enter/Space | On Add Vehicle button |
| Close modal | Escape | When modal open |
| Submit form | Enter | When form focused |
| Navigate table rows | Arrow keys | When table focused |
| Paginate | Left/Right arrows | When pagination focused |

**Focus management:**
- Modal open: focus trapped inside modal, first focusable element receives focus
- Modal close: focus returns to trigger button
- Error boundary: focus moves to error message
- Page navigation: focus moves to main content area

**Acceptance criteria:**
- [ ] All interactive elements have appropriate ARIA labels
- [ ] Sidebar navigable by keyboard
- [ ] Modal focus trap works correctly
- [ ] All form inputs have associated labels
- [ ] Color is not the sole indicator (icons + text alongside)
- [ ] Focus-visible rings on all interactive elements
- [ ] Screen reader can navigate all pages meaningfully

### FR-5: Consistent Loading Skeletons

Standardize loading states across all pages.

**Current state:** Each page implements its own ad-hoc skeleton. No shared skeleton components.

**New approach:**
- Create reusable skeleton primitives in `components/ui/skeleton.tsx` (shadcn pattern)
- Use consistent skeleton dimensions matching the content they replace
- Add `loading.tsx` files for Next.js App Router streaming

**Skeleton components:**

| Component | Used In |
|-----------|---------|
| `Skeleton` (base) | Everywhere — animated pulse rectangle |
| `StatsCardSkeleton` | Dashboard, Aging page |
| `TableSkeleton` | Inventory, Aging tables |
| `ChartSkeleton` | Dashboard charts |
| `VehicleInfoSkeleton` | Vehicle detail page |

**Next.js loading files:**

| File | Purpose |
|------|---------|
| `app/loading.tsx` | Global loading fallback |
| `app/inventory/loading.tsx` | Inventory page loading |
| `app/aging/loading.tsx` | Aging page loading |
| `app/vehicles/[id]/loading.tsx` | Vehicle detail loading |

**Acceptance criteria:**
- [ ] Shared `Skeleton` component in `components/ui/`
- [ ] All pages use consistent skeleton patterns
- [ ] `loading.tsx` files provide instant loading feedback
- [ ] Skeletons match the dimensions of the content they replace
- [ ] Smooth transition from skeleton to content (no layout shift)

## Non-Functional Requirements

- **Performance**: Error boundaries add zero runtime overhead when no error occurs. API client retry adds at most 1 second on 5xx errors.
- **Accessibility**: WCAG 2.1 Level AA compliance for color contrast, keyboard navigation, and screen reader support.
- **Reliability**: Error boundaries prevent full app crashes. API retry handles transient 5xx errors.

## Architecture Changes (C4)

### Diagrams to Update
None — these are frontend-internal improvements, no new containers or services.

### New Diagrams
None.

## Runtime Flow Diagrams

None needed — error boundaries and retry logic are cross-cutting concerns, not new business flows.

## Data Model Changes

None.

## API Changes

None.

## UI/UX Changes

### Existing Component Inventory (REQUIRED)

| Need | Existing Component | Location |
|------|--------------------|----------|
| All existing components | Various | To be enhanced with ARIA labels |
| VehicleFilters | VehicleFilters | `components/vehicle-filters.tsx` (modify for dynamic makes) |
| API client | apiFetch | `lib/api/client.ts` (to be enhanced) |

### New Components

| Component | Location | Justification |
|-----------|----------|---------------|
| Skeleton (shadcn) | `components/ui/skeleton.tsx` | Base skeleton animation. No existing skeleton primitive. |
| ErrorFallback | `components/error-fallback.tsx` | Shared error UI for error boundaries. Reduces duplication across error.tsx files. |

## Security & Risk Assessment

### Data Flow Diagram

No new data flows. All changes are client-side improvements to error handling and UI.

### Threats Identified

| # | Threat | Severity | Mitigation |
|---|--------|----------|------------|
| T-1 | Error boundary reveals stack traces | Medium | Log errors to console only, show generic user-facing message |
| T-2 | API retry amplifies DoS | Low | Only 1 retry, only on 5xx, only GET requests |
| T-3 | Dynamic makes from API could be manipulated | Low | Makes are display-only filter options, no security impact |

### Issues & Risks Summary

1. Error boundaries must be `"use client"` in Next.js — they can't be server components.
2. API retry on 5xx could mask persistent backend issues — should log retries for observability.
3. Dynamic filter data depends on dashboard summary being available — needs graceful fallback.

## Edge Cases & Error Handling

| Scenario | Handling |
|----------|---------|
| Error boundary catches error in error boundary | Global error.tsx catches nested error boundary failures |
| API timeout after 30s | Show timeout-specific error message |
| All retries fail | Show "Service temporarily unavailable, please try again later" |
| Dashboard summary fails → no makes for filter | Show empty dropdown with "All Makes" only |
| Focus trap in modal with no focusable elements | Fallback: focus the modal container itself |

## Dependencies & Assumptions

- **New dependencies**: None (all features use existing packages)
- **Assumptions**: Backend error responses follow `ErrorResponse` schema (`{ code, message }`). Next.js error boundary API is stable.

## Out of Scope

- Client-side error reporting service (Sentry, LogRocket)
- Server-side error logging enhancement
- Comprehensive WCAG audit (just the most impactful items)
- Internationalization (i18n)
- Offline support / service worker
- Analytics / telemetry
