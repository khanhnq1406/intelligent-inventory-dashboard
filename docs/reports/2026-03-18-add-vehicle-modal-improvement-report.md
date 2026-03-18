# Add Vehicle Modal — Implementation Report

## Summary

Fixed the UUID display bug in the dealership SelectTrigger and refreshed the modal form with improved visual hierarchy: loading skeleton, colored status dots, price $ adornment, section divider, and warning icons on errors.

## Spec Reference

`docs/specs/2026-03-18-add-vehicle-modal-improvement-spec.md`

## Plan Reference

`docs/plans/2026-03-18-add-vehicle-modal-improvement-plan.md`

## Tasks Completed

| # | Task | Status | Files Changed | Tests | TDD |
|---|------|--------|---------------|-------|-----|
| 1 | Write failing tests for new behavior | Done | `add-vehicle-modal.test.tsx` | +4 new | Yes (RED first) |
| 2 | Fix dealership trigger UUID → name + skeleton | Done | `add-vehicle-modal.tsx` | 17/17 pass | Yes (GREEN) |
| 3 | Status dots, price adornment, section divider, error icons | Done | `add-vehicle-modal.tsx` | 17/17 pass | Yes (GREEN) |

## Test Coverage Summary

| Layer | Test File | Tests | Pass | Coverage Area |
|-------|-----------|-------|------|---------------|
| Frontend Component | `add-vehicle-modal.test.tsx` | 17 | 17/17 | Rendering, validation, UX, accessibility |

## Security Implementation Summary

| Concern | Implementation | Verified |
|---------|---------------|----------|
| No new inputs/data flows | Pure rendering change | Yes |
| No XSS risk | dealerships.find() on parsed JSON, no dangerouslySetInnerHTML | Yes |
| Submitted value unchanged | dealership_id UUID still submitted as form value | Yes |

## Review Results

### Spec Compliance

All functional requirements met:
- Dealership trigger shows name (via `dealerships.find()`) not UUID
- Loading skeleton shown (`animate-pulse`) when `dealerships` is undefined
- Status items have colored dot indicators (green/gray/amber)
- Status trigger reflects selected status with dot
- Price field has `$` prefix adornment
- Section divider (`<hr>`) between VIN and Status+StockedAt rows
- Warning icon (`⚠`) on all 5 field error messages
- Form spacing tightened to `space-y-3`
- `SelectValue` removed from import (unused)

### Security Review

PASS — No new attack surface. Pure rendering change. API submission payload unchanged.

### Code Quality

PASS — Single file modification. `STATUS_CONFIG` constant avoids duplication. Skeleton uses standard Tailwind `animate-pulse`. No new dependencies.

## Known Issues / Technical Debt

- `page.test.tsx` has 5 pre-existing failures (missing `QueryClientProvider` for `useRecentActions` in test setup) — out of scope for this feature.

## Files Changed

- `frontend/src/components/add-vehicle-modal.tsx` — Component implementation (97 insertions, 37 deletions)
- `frontend/src/components/__tests__/add-vehicle-modal.test.tsx` — Test refactor + 4 new tests (71 insertions, 8 deletions)
- `docs/reports/2026-03-18-add-vehicle-modal-improvement-progress.md` — Progress tracking

## How to Test

1. `cd frontend && npm run dev`
2. Open the inventory page, click "Add Vehicle"
3. Observe: "Select dealership" placeholder (not UUID) shown initially
4. Observe: Dealership dropdown skeleton pulse while loading (simulate by throttling network)
5. Select a dealership — name shown in trigger, not UUID
6. Observe Status select with colored dots (green/gray/amber)
7. Observe `$` prefix on price field
8. Observe `<hr>` divider between VIN and Status rows
9. Click "Add Vehicle" without filling required fields — observe ⚠ icon on error messages
