# Fix: Actions Missing in Vehicle List Responses

## Summary

The `GET /api/v1/vehicles` endpoint returns vehicles without their action history (`actions` field is absent). This causes the dashboard "Recent Actions" table and the aging page "Last Action" column to always show "No actions", even though actions exist in the database. The vehicle detail page (`GET /api/v1/vehicles/{id}`) works correctly because it runs a separate query for actions. The fix modifies the `List` SQL query in the repository to include the last 3 actions per vehicle using a `LEFT JOIN LATERAL`, eliminating the need for a second round-trip.

## User Stories

- As a dealership manager, I want the dashboard "Recent Actions" table to show the most recent vehicle actions, so I can track activity without navigating to each vehicle.
- As a dealership manager, I want the aging page "Last Action" column to reflect the most recent action per vehicle, so I can see which aging vehicles have been actioned recently.

## Functional Requirements

### FR-1: Vehicle List Includes Last 3 Actions Per Vehicle
The `GET /api/v1/vehicles` endpoint must return each vehicle's last 3 actions (ordered by `created_at DESC`) in the `actions` array. Vehicles with no actions return an empty array (not `null`/absent).

**Acceptance criteria:**
- [ ] `GET /api/v1/vehicles` response includes `actions` array on each vehicle item
- [ ] `actions` contains at most 3 entries per vehicle, ordered newest-first
- [ ] Vehicles with zero actions have `actions: []`
- [ ] Dashboard "Recent Actions" table displays actual actions
- [ ] Aging page "Last Action" column displays the most recent action type (or "No actions" only when truly none exist)
- [ ] Existing handler test for `ListVehicles` is updated to cover the `actions` field

### FR-2: Handler Populates Actions in ListVehicles Response
`ListVehicles` handler must map `v.Actions` onto the response items, parallel to how `GetVehicle` already does it.

**Acceptance criteria:**
- [ ] `modelVehicleToResponse` result has `Actions` set in the list path
- [ ] No change to `GetVehicle` handler (already correct)

## Non-Functional Requirements

- **Performance**: The `LEFT JOIN LATERAL` is bounded by the page size (max 100 vehicles). Adding `LIMIT 3` per lateral subquery keeps the row multiplication minimal. No additional round-trips.
- **Backward compatibility**: `actions` is already defined as optional (`*[]VehicleAction`) in the OpenAPI schema. Populating it where it was previously absent is non-breaking for all existing consumers.
- **No OpenAPI changes**: The schema already supports `actions` on `Vehicle`. No `make generate` needed.

## Architecture Changes (C4)

### Diagrams to Update
None. This is a bug fix within existing components — no new components, services, or external integrations are introduced. The `docs/plans/2026-03-17-system-design.md` Container and Component diagrams remain accurate.

### New Diagrams
None required.

## Runtime Flow Diagrams

### Flow Diagrams to Update
The existing vehicle list flow (if documented) should note that `actions` are now included via lateral join. No new diagram needed — the flow is a simple SQL query change with no new branching or multi-service coordination.

### New Flow Diagrams
None. The change is a single SQL query modification; no new sequence or branching logic is introduced.

## Data Model Changes

None. `vehicle_actions` table and `vehicles` table schemas are unchanged. `models.Vehicle.Actions []VehicleAction` already exists. No migrations needed.

## API Changes

None. The `Vehicle` schema in `api/openapi.yaml` already has:
```yaml
actions:
  type: array
  items:
    $ref: "#/components/schemas/VehicleAction"
  description: Action history, included in vehicle detail response
```
The fix populates this field in the list endpoint — no spec change required. No `make generate` needed.

## UI/UX Changes

None. The frontend already reads `v.actions` correctly on both pages — it just receives empty data today. Once the backend populates the field, both pages will render correctly without any frontend changes.

## Security & Risk Assessment

### Data Flow Diagram

| # | Source | Data | Trust Boundary Crossed? | Destination | Notes |
|---|--------|------|------------------------|-------------|-------|
| 1 | PostgreSQL `vehicle_actions` | action rows (type, notes, created_by, created_at) | No | Backend `List` query result | Internal DB read, no new boundary |
| 2 | Backend `List` handler | serialized Vehicle JSON with actions | No — existing boundary | Frontend via HTTP | Same trust boundary as before |

### Trust Boundaries

| Boundary | Crossed By | Security Control |
|----------|-----------|-----------------|
| Internet → App | User HTTP requests | Existing middleware (request ID, CORS, structured logging) |
| App → DB | SQL queries | Parameterized queries (no user input in LATERAL subquery) |

### Threats Identified (STRIDE per boundary crossing)

| # | Data Flow | Boundary | STRIDE | Threat | Severity | Mitigation |
|---|-----------|----------|--------|--------|----------|------------|
| T-1 | 2 | App → Client | Information Disclosure | Actions from one dealership visible to another | Low | Dealership filter already applied in WHERE clause; lateral subquery inherits `v.vehicle_id` so only that vehicle's actions are returned |
| T-2 | 1 | App → DB | Tampering / Injection | Malicious sort/filter params influencing lateral subquery | Low | Lateral subquery references only `vehicle_id` (a DB-internal value); no user input flows into it |

### Authorization Rules

No change. Dealership scoping is enforced via the existing `WHERE v.dealership_id = $N` condition. The `LEFT JOIN LATERAL` uses `a.vehicle_id = v.id` — a purely internal join condition with no user-controlled input.

### Input Validation Rules

No new input. The lateral subquery has no new parameters; it binds only `v.id` from the already-fetched vehicle row.

### External Dependency Risks

None. No new external dependencies.

### Sensitive Data Handling

`notes` field in `vehicle_actions` may contain free-text notes. This is already returned by `GET /api/v1/vehicles/{id}` — including it in the list response is consistent with the existing data exposure posture. The lateral join limits to 3 actions, so note volume is bounded.

### Issues & Risks Summary

1. The lateral join increases bytes-per-row in the list response. For the default page size of 20 and max of 100, this is negligible.
2. `ListAll` (used by CSV export) does not need actions — leave it unchanged to avoid unnecessary data in the export path.

## Edge Cases & Error Handling

- **Vehicle with no actions**: `LEFT JOIN LATERAL ... ON true` with `LIMIT 3` returns no rows for that vehicle; the scan loop produces an empty slice — serializes as `[]`.
- **Scan of nullable `notes`**: Already handled in `GetByID` via `var notes *string` pattern — use the same approach in `List`.
- **`rows.Err()` check**: Must be called after the scan loop (already done in `List`; ensure the notes nullable scan is consistent).

## Dependencies & Assumptions

- PostgreSQL supports `LEFT JOIN LATERAL` (requires PG 9.3+; project uses PG 16 — satisfied).
- The `actions` field in `modelVehicleToResponse` is `*[]VehicleAction`. The handler sets it as a pointer to a slice, consistent with `GetVehicle`.
- `ListAll` (CSV export) intentionally excludes actions and must remain unchanged.

## Out of Scope

- Adding actions to the CSV export.
- Changing the number of actions returned per vehicle in the list (3 is sufficient for dashboard/aging use cases).
- Adding pagination for actions within the list endpoint.
- Changing how `GetVehicle` fetches actions (it already works correctly).
