# Recent Actions Endpoint — Implementation Report

## Summary

Implemented `GET /api/v1/actions/recent` — a purpose-built endpoint that returns the N most recent vehicle actions across all vehicles (or for a specific dealership), enriched with vehicle context (make, model, year, days in stock). Replaced the dashboard's vehicle-fetch workaround with a dedicated `useRecentActions` hook.

## Spec Reference

`docs/specs/2026-03-18-recent-actions-endpoint-spec.md`

## Plan Reference

`docs/plans/2026-03-18-recent-actions-endpoint-plan.md`

## Tasks Completed

| # | Task | Status | Files Changed | Tests | TDD |
|---|------|--------|---------------|-------|-----|
| 0 | Add created_at index migration | Done | 2 migration files | — | — |
| 1 | OpenAPI spec — RecentAction schema + endpoint | Done | openapi.yaml, api.gen.go, types.ts, handler stub | Build passes | — |
| 2 | Model — add RecentAction + RecentActionsFilter | Done | models.go | Build passes | — |
| 3 | Repository — add ListRecent | Done | repository.go, vehicle_action.go | Existing repo tests pass | — |
| 4 | Service — add ListRecent with validation | Done | service.go, vehicle_action.go, vehicle_action_test.go | 7/7 pass | Yes |
| 5 | Handler — implement ListRecentActions | Done | handler.go, handler_test.go | 5/5 pass | Yes |
| 6 | Frontend hook — useRecentActions | Done | use-recent-actions.ts | Lint clean | — |
| 7 | Dashboard — replace workaround with useRecentActions | Done | page.tsx | Lint clean | — |

## Test Coverage Summary

| Layer | Test File | Tests | Pass | Coverage Area |
|-------|-----------|-------|------|---------------|
| Backend Service | `vehicle_action_test.go` | 7 | 7/7 | Limit validation [1,50], dealership filter, repo error propagation |
| Backend Handler | `handler_test.go` | 5 | 5/5 | Success, default limit, service error, invalid limit→400, dealership filter |

## Security Implementation Summary

| Concern | Implementation | Verified |
|---------|---------------|----------|
| SQL injection | Two parameterized placeholders ($1 for dealership_id, $2 for limit), zero string interpolation | Yes |
| UUID validation | `dealership_id` typed as `*openapi_types.UUID` by oapi-codegen — invalid UUIDs rejected at generated layer | Yes |
| Limit validation | Service layer enforces [1, 50]; values outside range return 400 | Yes |
| No new auth surface | Matches existing project security posture | Yes |

## Files Changed

**Backend:**
- `backend/migrations/003_vehicle_actions_created_at_idx.up.sql` (new)
- `backend/migrations/003_vehicle_actions_created_at_idx.down.sql` (new)
- `api/openapi.yaml` (added RecentAction schema + endpoint)
- `backend/internal/handler/api.gen.go` (regenerated)
- `backend/internal/handler/handler.go` (added ListRecentActions)
- `backend/internal/handler/handler_test.go` (added 5 tests + ListRecent mock method)
- `backend/internal/models/models.go` (added RecentAction, RecentActionsFilter)
- `backend/internal/repository/repository.go` (added ListRecent to interface)
- `backend/internal/repository/vehicle_action.go` (implemented ListRecent)
- `backend/internal/service/service.go` (added ListRecent to interface)
- `backend/internal/service/vehicle_action.go` (implemented ListRecent)
- `backend/internal/service/vehicle_action_test.go` (added 7 tests + ListRecent mock method)

**Frontend:**
- `frontend/src/lib/api/types.ts` (regenerated)
- `frontend/src/hooks/use-recent-actions.ts` (new)
- `frontend/src/app/page.tsx` (replaced workaround with useRecentActions)

## How to Test

```bash
# Start the stack
docker compose up -d
make migrate-up

# Verify endpoint
curl -s "http://localhost:8080/api/v1/actions/recent?limit=3" | jq .
curl -s "http://localhost:8080/api/v1/actions/recent?limit=3&dealership_id=<uuid>" | jq .

# Verify validation
curl -s "http://localhost:8080/api/v1/actions/recent?limit=0" | jq .    # expect 400
curl -s "http://localhost:8080/api/v1/actions/recent?limit=51" | jq .   # expect 400

# Browser: http://localhost:3000 — Recent Actions shows 3 rows from dedicated endpoint
```

## Commits

| Hash | Message |
|------|---------|
| e31963b | feat(db): add created_at DESC index on vehicle_actions for recent-actions query |
| 17a08ec | feat(api): add RecentAction schema and GET /api/v1/actions/recent endpoint to OpenAPI spec |
| 428fb58 | feat(models): add RecentAction struct and RecentActionsFilter |
| 20aafec | feat(repository): add ListRecent to VehicleActionRepository with JOIN vehicles query |
| 32c1459 | feat(service): add ListRecent to VehicleActionService with limit validation |
| 86596ed | feat(handler): implement ListRecentActions for GET /api/v1/actions/recent |
| 6a2174d | feat(hooks): add useRecentActions hook for GET /api/v1/actions/recent |
| d2af4b6 | feat(dashboard): replace vehicle-page workaround with useRecentActions hook |
