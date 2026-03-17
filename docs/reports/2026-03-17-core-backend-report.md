# Core Backend Implementation Report

## Summary

Implemented all 6 backend endpoints (ListDealerships, ListVehicles, GetVehicle, ListVehicleActions, CreateVehicleAction, GetDashboardSummary) with complete repository, service, and handler layers following a three-layer architecture (handler → service → repository).

## Spec Reference
`docs/specs/2026-03-17-core-backend-spec.md`

## Plan Reference
`docs/plans/2026-03-17-core-backend-plan.md`

## Tasks Completed

| # | Task | Status | Files Changed | Tests | TDD |
|---|------|--------|---------------|-------|-----|
| 1 | Dealership Repo + Service | Done | 3 created | 3/3 pass | Yes |
| 2 | Vehicle Repository | Done | 1 created | — (pgx wrapper) | — |
| 3 | Vehicle Service + Tests | Done | 2 created | 13/13 pass | Yes |
| 4 | VehicleAction Repo + Service + Tests | Done | 3 created | 13/13 pass | Yes |
| 5 | Dashboard Repo + Cache + Service + Tests | Done | 4 created | 7/7 pass | Yes |
| 6 | Wire Handler | Done | 2 modified | — (wiring) | — |
| 7 | Handler Tests | Done | 1 modified | 20/20 pass | Yes |
| 8 | Integration Verification | Done | — | 49/49 pass | — |

## Test Coverage Summary

| Layer | Test File | Tests | Pass | Coverage Area |
|-------|-----------|-------|------|---------------|
| Service: Dealership | `dealership_test.go` | 3 | 3/3 | List success, empty, error |
| Service: Vehicle | `vehicle_test.go` | 13 | 13/13 | Pagination, filter defaults, sort whitelist, page bounds, error |
| Service: VehicleAction | `vehicle_action_test.go` | 13 | 13/13 | Validation (action_type, created_by, notes), vehicle existence, cache invalidation, error |
| Service: Dashboard | `dashboard_test.go` | 7 | 7/7 | Cache hit/miss/expiry/invalidate, thread safety, service DB fetch |
| Handler: All endpoints | `handler_test.go` | 20 | 20/20 | 200/201/400/404/500 responses per endpoint |

## Security Implementation Summary

| Concern | Implementation | Verified |
|---------|---------------|----------|
| SQL injection | pgx parameterized queries ($1, $2, ...) everywhere | Yes |
| Sort column injection | Whitelist map in repository + service layers | Yes |
| Input validation | Server-side validation in service layer (action_type enum, field lengths) | Yes |
| Page size cap | Max 100, default 20, enforced in service | Yes |
| Error sanitization | Generic ErrorResponse format, no internal details leaked | Yes |
| Vehicle existence check | Before action create and list, returns 404 | Yes |
| Cache thread safety | sync.RWMutex on DashboardCache | Yes |
| Cache invalidation | On action creation, dashboard cache cleared | Yes |
| Append-only actions | INSERT only, no UPDATE/DELETE endpoints | Yes |

## Files Changed

### Created (14 files)
- `backend/internal/repository/dealership.go`
- `backend/internal/repository/vehicle.go`
- `backend/internal/repository/vehicle_action.go`
- `backend/internal/repository/dashboard.go`
- `backend/internal/service/dealership.go`
- `backend/internal/service/dealership_test.go`
- `backend/internal/service/vehicle.go`
- `backend/internal/service/vehicle_test.go`
- `backend/internal/service/vehicle_action.go`
- `backend/internal/service/vehicle_action_test.go`
- `backend/internal/service/dashboard.go`
- `backend/internal/service/dashboard_cache.go`
- `backend/internal/service/dashboard_test.go`
- `docs/reports/2026-03-17-core-backend-progress.md`

### Modified (3 files)
- `backend/internal/handler/handler.go` — Full implementation of all 6 endpoints
- `backend/internal/handler/handler_test.go` — 20 handler tests
- `backend/cmd/server/main.go` — Wired all new services

## Fix History

| Date | Fix | Severity | Files Changed |
|------|-----|----------|---------------|
| 2026-03-17 | Fix `gofmt` formatting in `vehicle_test.go` (struct field alignment) | Minor | `backend/internal/service/vehicle_test.go` |
| 2026-03-17 | Upgrade Next.js 14.2.35 → 15.5.13 and eslint-config-next 14.2.35 → 15.5.13 to resolve 4 high-severity npm audit vulnerabilities (glob CLI injection GHSA-5j98-mcp5-4vw2, Next.js DoS GHSA-9g9p-9gw9-jx7f, Next.js RSC deserialization DoS GHSA-h25m-26qc-wcjf) | Minor | `frontend/package.json`, `frontend/package-lock.json`, `frontend/tsconfig.json` |

## How to Test

```bash
# Run all backend tests
cd backend && go test -v -race ./...

# Start the full stack
docker compose up -d

# Test endpoints
curl -s http://localhost:8080/health | jq .
curl -s http://localhost:8080/api/v1/dealerships | jq .
curl -s 'http://localhost:8080/api/v1/vehicles' | jq .
curl -s 'http://localhost:8080/api/v1/vehicles?aging=true&sort_by=stocked_at&order=desc' | jq .
curl -s http://localhost:8080/api/v1/dashboard/summary | jq .
```
