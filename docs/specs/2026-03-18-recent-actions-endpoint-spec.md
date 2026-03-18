# Recent Actions Endpoint Specification

## Summary

Add `GET /api/v1/actions/recent` — a dedicated endpoint that returns the N most recently created actions across all vehicles, enriched with vehicle info (make, model, year, days_in_stock). Replaces the current workaround on the dashboard that fetches a large page of vehicles and flattens their embedded actions client-side. This fix scales correctly regardless of inventory size.

**Origin:** Follow-up to `docs/reports/2026-03-18-fix-actions-in-list-report.md`. The `page_size: 20` workaround works for the seed data but breaks as inventory grows.

## User Stories

- As a dealership manager, I want to see the 3 most recent actions taken across my inventory on the dashboard, so that I stay aware of recent activity without navigating away.
- As a frontend developer, I want a single, purpose-built endpoint for recent actions, so that I'm not over-fetching vehicle pages and doing client-side flattening.

## Functional Requirements

### FR-1: New Endpoint — `GET /api/v1/actions/recent`

Returns an array of the N most recently created `vehicle_actions` rows, joined with their parent vehicle's make, model, year, and days_in_stock.

**Parameters:**
- `limit` (query, integer, optional) — Number of actions to return. Min: 1, Max: 50, Default: 10.
- `dealership_id` (query, uuid, optional) — Filter to actions whose vehicle belongs to this dealership.

**Response:** `200 OK` — array of `RecentAction` objects (see schema below).

**Acceptance criteria:**
- [ ] Returns actions ordered by `created_at DESC`
- [ ] Respects `limit` (default 10, max 50)
- [ ] `dealership_id` filter scopes results to that dealership's vehicles only
- [ ] Without `dealership_id`, returns across all dealerships
- [ ] Each item includes: `id`, `vehicle_id`, `vehicle_make`, `vehicle_model`, `vehicle_year`, `days_in_stock`, `action_type`, `notes`, `created_by`, `created_at`
- [ ] Empty inventory returns `[]`, not an error
- [ ] Invalid `dealership_id` format returns `400`
- [ ] `limit` outside [1, 50] is clamped or returns `400`

### FR-2: Dashboard Uses New Endpoint

Replace the `useVehicles({ page_size: 20 })` workaround in `frontend/src/app/page.tsx` with a `useRecentActions({ limit: 3 })` hook call.

**Acceptance criteria:**
- [ ] Dashboard "Recent Actions" table shows actions from `useRecentActions`
- [ ] `vehiclesData` call on dashboard page (line 44) is removed
- [ ] No functional change visible to the user — same 3-row table with same columns

## Non-Functional Requirements

- **Performance:** Single SQL query with JOIN — O(log N) on `created_at` index. No N+1.
- **Security:** `dealership_id` validated as UUID before SQL execution. `limit` validated as integer in [1, 50]. No user-controlled string interpolated into SQL.

## Architecture Changes (C4)

### Diagrams to Update

No structural change to the C4 container or component diagrams — this is a new method on existing layers (repository, service, handler), not a new container or component. No C4 update needed.

### New Diagrams

None — the flow mirrors the existing `listVehicleActions` endpoint pattern, just cross-vehicle.

## Runtime Flow Diagrams

### New Flow Diagrams

No new flow diagram needed — this is simple CRUD (read-only, no branching, no multi-service coordination). The SQL JOIN is the only non-trivial piece; it doesn't warrant a sequence diagram beyond what the code communicates directly.

## Data Model Changes

No schema changes. The query joins existing `vehicle_actions` and `vehicles` tables:

```sql
SELECT va.id, va.vehicle_id, va.action_type, va.notes, va.created_by, va.created_at,
       v.make, v.model, v.year,
       EXTRACT(EPOCH FROM NOW() - v.stocked_at)::int / 86400 AS days_in_stock
FROM vehicle_actions va
JOIN vehicles v ON v.id = va.vehicle_id
WHERE ($1::uuid IS NULL OR v.dealership_id = $1)
ORDER BY va.created_at DESC
LIMIT $2
```

## API Changes

Add to `api/openapi.yaml`:

```yaml
/api/v1/actions/recent:
  get:
    operationId: listRecentActions
    summary: List recent actions across all vehicles
    parameters:
      - name: limit
        in: query
        required: false
        schema:
          type: integer
          minimum: 1
          maximum: 50
          default: 10
      - name: dealership_id
        in: query
        required: false
        schema:
          type: string
          format: uuid
    responses:
      "200":
        description: Recent actions with vehicle info
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: "#/components/schemas/RecentAction"
      "400":
        $ref: "#/components/responses/BadRequest"
      "500":
        $ref: "#/components/responses/InternalServerError"
```

New schema `RecentAction` (add to `components/schemas`):

```yaml
RecentAction:
  type: object
  required:
    - id
    - vehicle_id
    - vehicle_make
    - vehicle_model
    - vehicle_year
    - days_in_stock
    - action_type
    - created_by
    - created_at
  properties:
    id:
      type: string
      format: uuid
    vehicle_id:
      type: string
      format: uuid
    vehicle_make:
      type: string
    vehicle_model:
      type: string
    vehicle_year:
      type: integer
    days_in_stock:
      type: integer
    action_type:
      type: string
      enum: [price_reduction, transfer, auction, marketing, wholesale, custom]
    notes:
      type: string
    created_by:
      type: string
    created_at:
      type: string
      format: date-time
```

## UI/UX Changes

**`frontend/src/app/page.tsx`** — Replace:
```tsx
// Before
const { data: vehiclesData } = useVehicles({ page_size: 20, ... });
const recentActions = vehiclesData?.items?.flatMap(...).sort(...).slice(0, 3);
```
With:
```tsx
// After
const { data: recentActions } = useRecentActions({ limit: 3 });
```

Table rendering stays identical — same columns (vehicle, action, days in stock, date).

### Existing Component Inventory

| Need | Existing Component | Location |
|------|--------------------|----------|
| Action badge display | `ActionBadge` | `frontend/src/components/action-badge.tsx` |
| Table primitives | `Table`, `TableRow`, etc. | `frontend/src/components/ui/table.tsx` |
| Data fetching hook | NEW — `useRecentActions` | `frontend/src/hooks/use-recent-actions.ts` |

### New Components

| Component | Location | Justification |
|-----------|----------|---------------|
| `useRecentActions` hook | `frontend/src/hooks/use-recent-actions.ts` | New endpoint needs its own typed hook |

## Security & Risk Assessment

### Data Flow Diagram

| # | Source | Data | Trust Boundary Crossed? | Destination | Notes |
|---|--------|------|------------------------|-------------|-------|
| 1 | Browser | `limit` (integer), `dealership_id` (uuid string) | Yes: Internet → App | Handler | User-controlled query params |
| 2 | Handler | Validated limit + dealership_id | No | Service | Internal trust |
| 3 | Service | Typed params | No | Repository | Internal trust |
| 4 | Repository | Parameterized query | Yes: App → DB | PostgreSQL | SQL params, no interpolation |
| 5 | PostgreSQL | `vehicle_actions JOIN vehicles` rows | Yes: DB → App | Repository | Read-only result set |
| 6 | Handler | `[]RecentAction` | Yes: App → Browser | JSON response | No sensitive fields |

### Trust Boundaries

| Boundary | Crossed By | Security Control |
|----------|-----------|-----------------|
| Internet → App | `limit`, `dealership_id` query params | Parse + validate in handler before service call |
| App → DB | SQL query | Parameterized query only — `$1`, `$2` placeholders |

### Threats Identified (STRIDE)

| # | Data Flow | Boundary | STRIDE | Threat | Severity | Mitigation |
|---|-----------|----------|--------|--------|----------|------------|
| T-1 | 1 | Internet → App | Tampering | Malformed `dealership_id` causes DB error | Low | Validate UUID format before query |
| T-2 | 1 | Internet → App | Tampering | `limit=999999` causes expensive query | Low | Clamp/validate limit to max 50 |
| T-3 | 4 | App → DB | Injection | Malicious `dealership_id` in SQL | Low | Parameterized query prevents this |
| T-4 | 6 | App → Browser | Info Disclosure | Actions from another dealership visible | Medium | `dealership_id` filter enforced server-side |

### Authorization Rules

- No authentication layer currently exists in the project. `dealership_id` is an optional filter — callers must pass their own dealership_id to scope results.
- No cross-dealership isolation beyond the optional filter. This matches the existing project authorization model.

### Input Validation Rules

| Field | Validation | Where |
|-------|-----------|-------|
| `limit` | Integer, 1–50, default 10 | Service layer |
| `dealership_id` | Valid UUID format if present | Handler (UUID parse) |

### External Dependency Risks

None. No new external dependencies introduced.

### Sensitive Data Handling

`vehicle_actions` contains `notes` (free-text, may contain pricing info) and `created_by` (staff name). Both are already returned by `GET /api/v1/vehicles/{id}/actions` — no new exposure.

### Issues & Risks Summary

1. No auth layer: any client can query any dealership's actions by guessing a UUID. Matches existing project security posture.
2. `limit` must be validated server-side — client must not control unbounded queries.

## Edge Cases & Error Handling

| Case | Expected Behavior |
|------|------------------|
| No actions in DB | Returns `[]` |
| `dealership_id` not found | Returns `[]` (not 404) |
| `limit` = 0 or negative | Return `400 Bad Request` |
| `limit` > 50 | Return `400 Bad Request` |
| `dealership_id` not a valid UUID | Return `400 Bad Request` |

## Dependencies & Assumptions

- `make generate` must be run after OpenAPI changes before backend compilation.
- TypeScript types auto-generated via `make generate-ts`.
- The `vehicle_actions.created_at` column is indexed (check `001_init.up.sql`).

## Out of Scope

- Pagination of recent actions (limit+offset) — the max 50 cap is sufficient for dashboard use.
- Filtering by action_type.
- Any authentication/authorization beyond the existing project model.
- Updating the `ListAll` CSV export.
