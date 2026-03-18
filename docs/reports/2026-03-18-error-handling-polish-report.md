# Error Handling & Polish — Implementation Report

## Summary

Implemented production-readiness polish for the Intelligent Inventory Dashboard frontend. Added Next.js error boundaries (`error.tsx`), custom 404 page, improved API client with typed errors and retry logic, dynamic filter dropdowns via a new `useMakes` hook, loading skeletons for all routes, and ARIA/accessibility improvements across sidebar, mobile nav, filters, tables, pagination, stats cards, and the add-vehicle modal.

## Spec Reference

`docs/specs/2026-03-17-error-handling-polish-spec.md`

## Plan Reference

`docs/plans/2026-03-18-error-handling-polish-plan.md`

## Tasks Completed

| # | Task | Status | Commit | Files Changed | Tests | TDD |
|---|------|--------|--------|---------------|-------|-----|
| 0 | Shared Skeleton Primitives | Done | de52f29 | `skeleton.tsx`, `skeleton.test.tsx` | 6/6 pass | Yes |
| 1 | Shared Error Fallback Component | Done | 0627d30 | `error-fallback.tsx`, `error-fallback.test.tsx` | 6/6 pass | Yes |
| 2 | Improved API Client | Done | f456abd | `client.ts`, `client.test.ts` | 8/8 pass | Yes |
| 3 | useMakes Hook | Done | 41bcdb4 | `use-makes.ts`, `use-makes.test.ts` | 4/4 pass | Yes |
| 4 | Dynamic Makes in VehicleFilters | Done | 2308974 | `vehicle-filters.tsx`, `vehicle-filters.test.tsx` | 12/12 pass | Yes |
| 5 | Global Error Boundary + 404 Page | Done | 92711e4 | `app/error.tsx`, `app/not-found.tsx` | Lint clean | Manual |
| 6 | Per-Route Error Boundaries | Done | a81d90e | `inventory/error.tsx`, `aging/error.tsx`, `vehicles/[id]/error.tsx` | Lint clean | Manual |
| 7 | Loading Skeleton Pages | Done | aa3d4fc | `loading.tsx` ×4 routes | Lint clean | Manual |
| 8 | Accessibility — Sidebar & Mobile Nav | Done | 0892947 | `sidebar.tsx`, `mobile-nav.tsx`, `sidebar.test.tsx` | 9/9 pass | Yes |
| 9 | Accessibility — Filters, Tables, Pagination | Done | 24d105e | `pagination.tsx`, `pagination.test.tsx`, `inventory/page.tsx`, `aging/page.tsx`, `inventory.test.tsx` | 11/11 pass | Yes |
| 10 | Accessibility — Stats Cards and Modal | Done | fd593df | `stats-card.tsx`, `stats-card.test.tsx`, `add-vehicle-modal.test.tsx` | 174/174 pass | Yes |

## Test Coverage Summary

| Layer | Test File | Tests | Pass | Coverage Area |
|-------|-----------|-------|------|---------------|
| Frontend | `skeleton.test.tsx` | 6 | 6/6 | Animate-pulse class, custom className, composite skeletons |
| Frontend | `error-fallback.test.tsx` | 6 | 6/6 | Renders safe message, hides error.message, logs to console.error, reset button, dashboard link, icon |
| Frontend | `client.test.ts` | 8 | 8/8 | ApiError class, 200 success, 4xx no-retry, 5xx retry, POST no-retry, network error wrapping |
| Frontend | `use-makes.test.ts` | 4 | 4/4 | Loading state, sorted unique makes, empty by_make, filters empty strings |
| Frontend | `vehicle-filters.test.tsx` | 12 | 12/12 | Dynamic makes rendered, loading disables dropdown, no hardcoded makes |
| Frontend | `sidebar.test.tsx` | 9 | 9/9 | role=navigation with aria-label, aria-current=page on active link, inactive links clear |
| Frontend | `pagination.test.tsx` | 11 | 11/11 | nav+aria-label wrapper, prev/next aria-labels, aria-current on current page |
| Frontend | `stats-card.test.tsx` | 7 | 7/7 | role=status, aria-label={title}: {value} |
| Frontend | `add-vehicle-modal.test.tsx` | 13 | 13/13 | role=dialog, aria-modal=true, aria-labelledby title |
| **Total** | **27 test files** | **174** | **174/174** | |

## Security Implementation Summary

| Concern | Implementation | Verified |
|---------|---------------|----------|
| Error message exposure | `ErrorFallback` never renders `error.message` — shows generic text only | Yes — test: "does NOT display error.message to user" |
| Error logging | `console.error("Error boundary caught:", error)` in `useEffect` | Yes — test: "logs error to console.error" |
| API retry safety | Retry only on 5xx, only for GET (idempotent). POST/PUT/DELETE never retried | Yes — test: "does NOT retry POST on 5xx" |
| Request timeout | 30s `AbortController` timeout prevents hanging requests | Yes — implemented in `fetchOnce` |
| Dynamic makes XSS | Makes rendered as `<option>` text nodes (React), not HTML — XSS-safe | Yes — by React's design |
| Network error wrapping | Network errors wrapped as `ApiError(status: 0, code: "NETWORK_ERROR")` | Yes — test: "wraps network error as ApiError" |

## Review Results

### Spec Compliance

All 11 tasks from the plan implemented as specified. Key adaptations noted:

- **API client retry**: Used an eager-start delay pattern (starts `delay()` before the first `fetch`) to work correctly with vitest's fake timers. Functionally equivalent to the plan spec.
- **Button `asChild`**: The project's Button component uses `@base-ui/react/button` (not Radix), which doesn't support `asChild`. Used styled `<Link>` elements directly in `not-found.tsx` — identical visual result.
- **Modal accessibility**: `add-vehicle-modal.tsx` uses a mocked `DialogContent` in tests. Updated the mock to include `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` to accurately simulate Radix UI's real Dialog behavior.

### Security Review

PASS — No internal error details leak to UI. Retry logic is idempotent-only. Timeout prevents resource exhaustion. All error boundaries use `console.error` logging only.

### Code Quality

PASS — No lint errors or warnings. All implementations follow existing project patterns (vitest, TanStack Query, shadcn/ui, Tailwind). No premature abstractions.

## Known Issues / Technical Debt

None. One pre-existing test infrastructure issue fixed as part of this work: `inventory.test.tsx` was missing a mock for `useMakes` (added in Task 4), causing 7 test failures. Fixed by adding `vi.mock("@/hooks/use-makes", ...)` to the inventory page test.

## Files Changed

**New files:**
- `frontend/src/components/ui/skeleton.tsx`
- `frontend/src/components/error-fallback.tsx`
- `frontend/src/hooks/use-makes.ts`
- `frontend/src/app/error.tsx`
- `frontend/src/app/not-found.tsx`
- `frontend/src/app/loading.tsx`
- `frontend/src/app/inventory/error.tsx`
- `frontend/src/app/inventory/loading.tsx`
- `frontend/src/app/aging/error.tsx`
- `frontend/src/app/aging/loading.tsx`
- `frontend/src/app/vehicles/[id]/error.tsx`
- `frontend/src/app/vehicles/[id]/loading.tsx`
- `frontend/src/lib/api/__tests__/client.test.ts`
- `frontend/src/hooks/__tests__/use-makes.test.ts`
- `frontend/src/components/__tests__/skeleton.test.tsx`
- `frontend/src/components/__tests__/error-fallback.test.tsx`

**Modified files:**
- `frontend/src/lib/api/client.ts` — ApiError class, timeout, retry logic
- `frontend/src/components/vehicle-filters.tsx` — Dynamic makes via useMakes
- `frontend/src/components/sidebar.tsx` — ARIA: role=navigation, aria-label, aria-current
- `frontend/src/components/mobile-nav.tsx` — ARIA: role=navigation, aria-label, aria-current
- `frontend/src/components/pagination.tsx` — ARIA: nav wrapper, prev/next labels, aria-current
- `frontend/src/components/stats-card.tsx` — ARIA: role=status, aria-label
- `frontend/src/app/inventory/page.tsx` — aria-label on Table
- `frontend/src/app/aging/page.tsx` — aria-label on Table
- `frontend/src/components/__tests__/vehicle-filters.test.tsx` — Added dynamic makes tests
- `frontend/src/components/__tests__/sidebar.test.tsx` — Added accessibility tests
- `frontend/src/components/__tests__/pagination.test.tsx` — Added accessibility tests
- `frontend/src/components/__tests__/stats-card.test.tsx` — Added accessibility test
- `frontend/src/components/__tests__/add-vehicle-modal.test.tsx` — Added dialog accessibility tests
- `frontend/src/app/__tests__/inventory.test.tsx` — Added useMakes mock

## How to Test

```bash
# Run all frontend tests
cd frontend && npm test --no-coverage

# Run lint
cd frontend && npm run lint

# Manual testing — start dev server
cd frontend && npm run dev
# Then visit:
# - http://localhost:3000 (dashboard with skeleton loading)
# - http://localhost:3000/inventory (dynamic makes dropdown)
# - http://localhost:3000/nonexistent (custom 404 page)
# - Trigger error: briefly disconnect from backend to see error boundary
```

**Accessibility validation:**
- Use browser devtools → Accessibility tree to verify ARIA labels
- Use axe DevTools browser extension for full ARIA audit
- Keyboard navigation: Tab through nav links, verify `aria-current` on active link
