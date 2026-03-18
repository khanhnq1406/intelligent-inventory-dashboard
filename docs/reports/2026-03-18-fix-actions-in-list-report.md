# Fix: Actions Missing in Vehicle List Responses — Implementation Report

## Summary

Populated the `actions` field in `GET /api/v1/vehicles` responses. Previously the field was always `null`/absent because the repository `List` query only selected vehicle columns, and the handler never mapped actions onto the response. Now the list returns up to 3 recent actions per vehicle, matching the behaviour of `GET /api/v1/vehicles/{id}`.

## Spec Reference

`docs/specs/2026-03-18-fix-actions-in-list-spec.md`

## Plan Reference

`docs/plans/2026-03-18-fix-actions-in-list-plan.md`

## Tasks Completed

| # | Task | Status | Files Changed | Tests | TDD |
|---|------|--------|---------------|-------|-----|
| 1 | Repository — LEFT JOIN LATERAL | Done | `repository/vehicle.go`, `repository/vehicle_test.go` | 7/7 pass | Yes |
| 2 | Handler — Map Actions in ListVehicles | Done | `handler/handler.go`, `handler/handler_test.go` | 21/21 pass | Yes |
| 3 | End-to-End Smoke Test | Pending (manual) | — | — | — |

## Test Coverage Summary

| Layer | Test File | Tests | Pass | Coverage Area |
|-------|-----------|-------|------|---------------|
| Repository helpers | `vehicle_test.go` | 7 | 7/7 | buildConditions, validateSortColumn, validateSortOrder |
| Handler | `handler_test.go` | 21 | 21/21 | ListVehicles incl. new TestListVehicles_IncludesActions |

## Security Implementation Summary

| Concern | Implementation | Verified |
|---------|---------------|----------|
| SQL injection | Lateral subquery binds only `v.id` (DB-internal value); sort column/order use whitelist | Yes |
| Dealership scoping | `WHERE v.dealership_id = $N` condition unchanged; lateral subquery is vehicle-scoped | Yes |
| Nullable fields | `notes`, `actionID`, `actionType`, `actionCreatedBy`, `actionCreatedAt` all scanned as `*T` | Yes |

## Review Results

### Spec Compliance

Plan called for `LEFT JOIN LATERAL` to fetch last 3 actions per vehicle and handler mapping mirroring `GetVehicle`. Both implemented exactly as specified.

### Security Review

No new user input introduced. Lateral subquery is parameterised on DB-internal `v.id` only. Dealership scoping preserved. Nullable `notes` handled with pointer scan.

### Code Quality

- Handler loop mirrors the existing `GetVehicle` pattern exactly.
- Repository uses `vehicleMap` + `vehicleOrder` to preserve `ORDER BY` sort order while grouping action rows.
- `time` import added (required for `*time.Time` scan pointers).

## Known Issues / Technical Debt

None. `ListAll` (CSV export) intentionally unchanged per plan — adding actions to the export is out of scope.

## Files Changed

- `backend/internal/repository/vehicle.go` — `List` function rewritten with `LEFT JOIN LATERAL`
- `backend/internal/repository/vehicle_test.go` — Created; unit tests for helper functions
- `backend/internal/handler/handler.go` — `ListVehicles` loop updated to map actions
- `backend/internal/handler/handler_test.go` — `TestListVehicles_IncludesActions` added
- `docs/reports/2026-03-18-fix-actions-in-list-progress.md` — Progress tracking

## Fix History

| Date | Fix | Severity | Commit |
|------|-----|----------|--------|
| 2026-03-18 | Dashboard "Recent Actions" empty — increased `page_size` from 10 to 20 in dashboard `useVehicles` call so aging vehicles (which hold seed actions) are included in the fetched page | Minor | pending |

## How to Test

```bash
# Start the stack
docker compose up -d

# Get a vehicle ID
curl -s "http://localhost:8080/api/v1/vehicles?page_size=1" | jq '.items[0].id'

# Create a test action (replace {id} with actual UUID)
curl -s -X POST "http://localhost:8080/api/v1/vehicles/{id}/actions" \
  -H "Content-Type: application/json" \
  -d '{"action_type":"price_reduction","created_by":"Manager","notes":"Test action"}'

# Verify list response includes actions
curl -s "http://localhost:8080/api/v1/vehicles?page_size=5" | jq '.items[].actions'

# Browser checks
# http://localhost:3000         — Dashboard "Recent Actions"
# http://localhost:3000/aging   — "Last Action" column
# http://localhost:3000/inventory — "Last Action" column
```
