# Frontend Testing Specification

## Summary

Set up a comprehensive frontend testing infrastructure using Vitest + React Testing Library for unit/component tests and Playwright for end-to-end (E2E) tests. Write tests for all existing hooks, components, and pages to establish a baseline test suite, then add E2E tests covering critical user flows (dashboard viewing, inventory filtering, vehicle detail, action logging).

## User Stories

- As a developer, I want unit tests for all TanStack Query hooks so that I can refactor data fetching logic with confidence.
- As a developer, I want component tests for all feature components so that I can verify rendering, interaction, and error states without manual testing.
- As a developer, I want E2E tests for critical user flows so that I can catch integration regressions before deployment.

## Functional Requirements

### FR-1: Vitest + React Testing Library Setup

Configure Vitest as the test runner with React Testing Library for component testing.

**Setup requirements:**
- Install: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `@vitejs/plugin-react`
- Configure `vitest.config.ts` at `frontend/vitest.config.ts`
- Configure test setup file at `frontend/src/test/setup.ts` (imports `@testing-library/jest-dom`)
- Add `npm test` script: `vitest run`
- Add `npm run test:watch` script: `vitest`
- Add `npm run test:coverage` script: `vitest run --coverage`
- Mock `apiFetch` globally for unit tests (no real API calls)
- Mock `next/navigation` (useRouter, useParams, usePathname)
- TanStack Query test wrapper with `QueryClient` for hooks testing

**Acceptance criteria:**
- [ ] `npm test` runs all `*.test.tsx` and `*.test.ts` files
- [ ] Tests run in jsdom environment (browser-like)
- [ ] No real API calls made during unit tests
- [ ] Coverage report generated with `npm run test:coverage`
- [ ] All tests pass in CI-like environment (no interactive browser)

### FR-2: Hook Tests

Test all 4 TanStack Query hooks.

**Tests to write:**

| Hook | Test File | Test Cases |
|------|-----------|-----------|
| `useDashboardSummary` | `hooks/__tests__/use-dashboard-summary.test.ts` | Fetches from correct URL; Returns typed data; Handles API error |
| `useVehicles` | `hooks/__tests__/use-vehicles.test.ts` | Fetches with default params; Builds correct query string from filters; Handles empty results; Handles API error |
| `useVehicle` | `hooks/__tests__/use-vehicle.test.ts` | Fetches by ID; Disabled when id is empty; Handles 404; Handles API error |
| `useCreateVehicleAction` | `hooks/__tests__/use-create-vehicle-action.test.ts` | Submits POST with correct body; Invalidates correct query keys on success; Handles 400 validation error |

**Acceptance criteria:**
- [ ] All 4 hooks have test files with at least 3 test cases each
- [ ] Tests use `renderHook` from `@testing-library/react` with QueryClient wrapper
- [ ] API calls are mocked (no real HTTP requests)
- [ ] Tests verify query keys, URLs, request bodies, and error handling

### FR-3: Component Tests

Test all feature components for rendering, interaction, and edge cases.

**Tests to write:**

| Component | Test File | Test Cases |
|-----------|-----------|-----------|
| `Sidebar` | `components/__tests__/sidebar.test.tsx` | Renders 3 nav links; Highlights active route; Logo renders correctly |
| `StatsCard` | `components/__tests__/stats-card.test.tsx` | Renders title and value; Shows change indicator; Handles missing optional props |
| `StatusBadge` | `components/__tests__/status-badge.test.tsx` | Renders correct color for each status; Handles unknown status |
| `ActionBadge` | `components/__tests__/action-badge.test.tsx` | Renders correct color for each action type; Handles unknown type |
| `Pagination` | `components/__tests__/pagination.test.tsx` | Renders page numbers; Disables prev on page 1; Disables next on last page; Calls onPageChange |
| `VehicleFilters` | `components/__tests__/vehicle-filters.test.tsx` | Renders search input; Debounces search (300ms); Dropdown selection calls onChange; Aging toggle works |
| `AgingProgressBar` | `components/__tests__/aging-progress-bar.test.tsx` | Shows correct width; Red color for >120 days; Orange for 90-120 |
| `VehicleInfoCard` | `components/__tests__/vehicle-info-card.test.tsx` | Renders all vehicle fields; Shows aging badge when is_aging; Hides aging badge when not aging |
| `ActionTimeline` | `components/__tests__/action-timeline.test.tsx` | Renders action list; Shows empty state; Latest action has blue dot |
| `ActionForm` | `components/__tests__/action-form.test.tsx` | Renders form fields; Submit disabled when required fields empty; Submits with correct data; Shows loading state; Shows error state |

**Acceptance criteria:**
- [ ] All 10 feature components have test files
- [ ] Tests use `render` from `@testing-library/react` and `userEvent` for interactions
- [ ] Tests verify DOM output, not implementation details
- [ ] Tests cover happy path, edge cases, and error states

### FR-4: Page Tests

Test page-level rendering with mocked hooks.

**Tests to write:**

| Page | Test File | Test Cases |
|------|-----------|-----------|
| Dashboard (`/`) | `app/__tests__/page.test.tsx` | Renders stats cards; Renders charts (mocked); Renders recent actions; Shows loading skeleton; Shows error state |
| Inventory (`/inventory`) | `app/__tests__/inventory.test.tsx` | Renders vehicle table; Filter changes trigger re-fetch; Pagination works; Row click navigates |
| Aging (`/aging`) | `app/__tests__/aging.test.tsx` | Renders alert banner; Renders aging table; Shows empty state when no aging vehicles |
| Vehicle Detail (`/vehicles/[id]`) | `app/vehicles/__tests__/detail.test.tsx` | Renders vehicle info; Renders action timeline; Form submission works; Shows 404 state |

**Acceptance criteria:**
- [ ] All 4 pages have test files
- [ ] Hooks are mocked at the module level (no API calls)
- [ ] Tests verify page structure and user interactions
- [ ] Loading and error states tested

### FR-5: Playwright E2E Setup

Configure Playwright for end-to-end testing against a running dev server.

**Setup requirements:**
- Install: `@playwright/test`
- Configure `playwright.config.ts` at `frontend/playwright.config.ts`
- Base URL: `http://localhost:3000`
- Browsers: Chromium only (for speed)
- Add `npm run test:e2e` script: `playwright test`
- Add `npm run test:e2e:ui` script: `playwright test --ui`
- Tests directory: `frontend/e2e/`

**E2E tests to write:**

| Test Suite | File | Scenarios |
|-----------|------|-----------|
| Dashboard | `e2e/dashboard.spec.ts` | Page loads with stats; Charts visible; Navigate to inventory via sidebar |
| Inventory | `e2e/inventory.spec.ts` | Table loads with vehicles; Search filters results; Pagination navigates; Click row goes to detail |
| Aging | `e2e/aging.spec.ts` | Alert banner shows count; Table shows aging vehicles; "Log Action" navigates to detail |
| Vehicle Detail | `e2e/vehicle-detail.spec.ts` | Info card shows data; Timeline shows actions; Submit action form; New action appears in timeline |

**Acceptance criteria:**
- [ ] Playwright configured and runnable
- [ ] 4 E2E test suites covering critical user flows
- [ ] Tests run against local dev server (requires backend + frontend running)
- [ ] Screenshots captured on failure
- [ ] Tests pass in headless mode

## Non-Functional Requirements

- **Performance**: Unit tests complete in under 30 seconds. E2E tests complete in under 2 minutes.
- **Reliability**: Tests are deterministic — no flaky tests from timing issues. Use proper waitFor/findBy patterns.
- **Maintainability**: Test utilities extracted to shared helpers. Mock data defined in fixtures.

## Architecture Changes (C4)

### Diagrams to Update
None — testing infrastructure doesn't change the application architecture.

### New Diagrams
None.

## Runtime Flow Diagrams

### Flow Diagrams to Update
None.

### New Flow Diagrams
None — tests verify existing flows, they don't create new ones.

## Data Model Changes

None.

## API Changes

None.

## UI/UX Changes

### Existing Component Inventory (REQUIRED)

No UI changes — this spec is testing infrastructure only.

### New Components

None.

## Security & Risk Assessment

### Data Flow Diagram

| # | Source | Data | Trust Boundary Crossed? | Destination | Notes |
|---|--------|------|------------------------|-------------|-------|
| N/A | Tests run locally | Mock data only | No | Local test runner | No real API calls in unit tests |
| E2E only | Playwright browser | Test actions | Yes: Browser → Local API | Local dev server | E2E tests hit real local endpoints |

### Threats Identified

| # | Threat | Severity | Mitigation |
|---|--------|----------|------------|
| T-1 | Test fixtures contain sensitive data | Low | Use clearly fake data (e.g., "TEST-VIN-12345678") |
| T-2 | E2E tests modify shared database | Low | E2E tests use isolated test data or reset between runs |

### Issues & Risks Summary

1. E2E tests require running backend + database — adds complexity to CI setup.
2. Mock data must stay in sync with OpenAPI types — use generated types for fixtures.

## Edge Cases & Error Handling

| Scenario | Handling |
|----------|---------|
| API mock returns unexpected shape | Test should fail with clear assertion error |
| Component renders with undefined props | Test verifies graceful handling |
| Slow async operations in tests | Use `waitFor` with reasonable timeouts |
| Flaky E2E from timing | Use Playwright's auto-waiting + explicit `waitForSelector` |

## Dependencies & Assumptions

- **New dependencies**: vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom, @vitejs/plugin-react, @playwright/test
- **Assumptions**: All existing components compile and render without errors. Backend API available for E2E tests.

## Out of Scope

- Visual regression testing (Chromatic, Percy)
- Performance testing (Lighthouse CI)
- Accessibility testing automation (axe-core integration)
- API/integration testing of backend endpoints (covered by Go tests)
- Load testing
