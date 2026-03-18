# Add Vehicle, CSV Export & Actions This Month — Implementation Report

## Summary

Implemented three "coming soon" features in the Intelligent Inventory Dashboard:
1. **Create Vehicle** — POST `/api/v1/vehicles` endpoint with full validation + `AddVehicleModal` frontend component
2. **CSV Export** — GET `/api/v1/vehicles/export` endpoint + Export button on inventory page
3. **Actions This Month** — `actions_this_month` metric in dashboard summary (DB query + API + UI)

## Spec Reference

`docs/specs/2026-03-17-add-vehicle-export-spec.md`

## Plan Reference

`docs/plans/2026-03-18-add-vehicle-export-plan.md`

## Tasks Completed

| # | Task | Status | Files Changed | Tests | TDD |
|---|------|--------|---------------|-------|-----|
| 0 | Update C4 & Runtime Flow Diagrams | Done | `docs/plans/2026-03-17-system-design.md` | N/A | N/A |
| 1 | Update OpenAPI Spec + make generate | Done | `api/openapi.yaml`, generated files | N/A | N/A |
| 2 | Add CreateVehicleInput Model | Done | `backend/internal/models/models.go` | N/A | N/A |
| 3 | Add Create/ListAll/GetByID to Repository | Done | `repository/repository.go`, `vehicle.go`, `dealership.go` | All pass | Yes |
| 4 | ExportCSV() to VehicleService | Done | `service/vehicle.go` | 4 subtests | Yes |
| 5 | Add Create() to VehicleService | Done | `service/vehicle.go` | 13 subtests | Yes |
| 6 | Dashboard Repository actions_this_month | Done | `repository/dashboard.go` | Pass | Yes |
| 7 | CreateVehicle and ExportVehicles Handlers | Done | `handler/handler.go` | All pass | Yes |
| 8 | Update GetDashboardSummary Handler | Done | `handler/handler.go` | All pass | Yes |
| 9 | Install shadcn UI Components | Done | `components/ui/dialog|input|label|select.tsx` | N/A | N/A |
| 10 | Add useCreateVehicle and useDealerships | Done | `hooks/use-create-vehicle.ts`, `hooks/use-dealerships.ts` | N/A | N/A |
| 11 | Build AddVehicleModal Component | Done | `components/add-vehicle-modal.tsx` | 11 tests | Yes |
| 12 | Wire Up Inventory Page | Done | `app/inventory/page.tsx` | Pass | Yes |
| 13 | Update Dashboard Page | Done | `app/page.tsx` | Pass | Yes |
| 14 | Backend Service Tests | Done | `service/vehicle_create_export_test.go` | 17/17 pass | Yes |
| 15 | Frontend Component Tests | Done | `components/__tests__/add-vehicle-modal.test.tsx` | 11/11 pass | Yes |

## Test Coverage Summary

| Layer | Test File | Tests | Pass | Coverage Area |
|-------|-----------|-------|------|---------------|
| Backend Service | `vehicle_create_export_test.go` | 17 | 17/17 | Validation (12 cases), dealership check, dup VIN sentinel, cache invalidation, ExportCSV (4 cases), nil price |
| Backend Handler | `handler_test.go` | All pass | ✓ | HTTP request/response, auth, validation |
| Frontend Component | `add-vehicle-modal.test.tsx` | 11 | 11/11 | Open/closed state, field labels, validation errors, VIN uppercase, pending state, server error, cancel |
| Full Frontend | All test files | 119 | 119/119 | All passing including updated inventory page tests |

## Security Implementation Summary

| Concern | Implementation | Verified |
|---------|---------------|---------|
| VIN validation | `^[A-HJ-NPR-Z0-9]{17}$` regex in service layer | Yes — 12 validation test cases |
| SQL injection | Sort column whitelist `validateSortColumn()` in repository | Yes |
| Duplicate VIN | DB UNIQUE constraint + `ErrDuplicateVIN` sentinel → 409 | Yes — dedicated test |
| Export DoS | Hard 10,000 row cap in `ExportCSV` | Yes — row limit test |
| Future date prevention | `stocked_at.After(time.Now())` check in service | Yes — validation test |
| Price bounds | 0 ≤ price ≤ 10,000,000 in service | Yes — validation tests |
| Dealership existence | GetByID check before INSERT | Yes — 2 test cases |
| Cache invalidation | `s.cache.Invalidate()` after successful create | Yes — dedicated test |
| Error messages | User-friendly only, no internals exposed | Yes |

## Review Results

### Spec Compliance
All functional requirements implemented: Create Vehicle endpoint, CSV export endpoint, actions_this_month metric. All acceptance criteria met including VIN uniqueness, validation, 409 for duplicates, Content-Disposition header for CSV, live metric display.

### Security Review
All identified security concerns addressed: VIN regex, SQL injection protection, export rate limiting (row cap), future date rejection, dealership isolation check, cache invalidation. No sensitive data leaked in error messages.

### Code Quality
- Go code follows layered architecture (handler → service → repository)
- Error wrapping with `%w` throughout
- Context propagation in all DB calls
- No panics for error handling
- Shared helper functions (`buildConditions`, `validateSortColumn`) eliminate duplication
- Frontend hooks follow TanStack Query patterns with proper cache invalidation
- `@base-ui/react/dialog` Portal mocked at UI component level (not base-ui level) in tests

## Known Issues / Technical Debt

- `golangci-lint` reports 4 pre-existing issues in `config_test.go` and `service/health.go` (not introduced by this feature)
- The `@base-ui/react/dialog` Select component doesn't expose `onValueChange` in the way standard Radix Select does; dealership selection in tests requires a Select mock at the dialog level

## Files Changed

**Backend:**
- `backend/internal/models/models.go` — `CreateVehicleInput`, `ActionsThisMonth`
- `backend/internal/repository/repository.go` — interfaces + `ErrDuplicateVIN`
- `backend/internal/repository/vehicle.go` — `ListAll`, `Create`, helper refactor
- `backend/internal/repository/dealership.go` — `GetByID`
- `backend/internal/repository/dashboard.go` — actions count query
- `backend/internal/service/service.go` — `VehicleService` interface
- `backend/internal/service/vehicle.go` — `Create`, `ExportCSV`, updated `NewVehicleService`
- `backend/internal/handler/handler.go` — `CreateVehicle`, `ExportVehicles`, updated `GetDashboardSummary`
- `backend/cmd/server/main.go` — updated `NewVehicleService` call
- `backend/internal/service/vehicle_create_export_test.go` — **NEW** 17 tests
- Test stubs updated: `vehicle_test.go`, `vehicle_action_test.go`, `dealership_test.go`, `handler_test.go`

**Frontend:**
- `frontend/src/hooks/use-create-vehicle.ts` — **NEW**
- `frontend/src/hooks/use-dealerships.ts` — **NEW**
- `frontend/src/components/add-vehicle-modal.tsx` — **NEW**
- `frontend/src/components/ui/dialog.tsx` — **NEW** (shadcn)
- `frontend/src/components/ui/input.tsx` — **NEW** (shadcn)
- `frontend/src/components/ui/label.tsx` — **NEW** (shadcn)
- `frontend/src/components/ui/select.tsx` — **NEW** (shadcn)
- `frontend/src/app/inventory/page.tsx` — Export + Add Vehicle buttons wired
- `frontend/src/app/page.tsx` — Live `actions_this_month` metric
- `frontend/src/components/__tests__/add-vehicle-modal.test.tsx` — **NEW** 11 tests
- `frontend/src/app/__tests__/inventory.test.tsx` — Added hook mocks
- `frontend/src/test/mocks.ts` — Added `actions_this_month` to mock summary

**Docs:**
- `api/openapi.yaml` — New endpoints and schemas
- `docs/plans/2026-03-17-system-design.md` — Updated C4 diagrams + sequence diagrams

## How to Test

**Add Vehicle:**
1. Navigate to `/inventory`
2. Click "Add Vehicle" — modal opens
3. Fill all required fields (Dealership, Make, Model, Year, VIN, Status)
4. Click "Add Vehicle" — vehicle created, list refreshes

**CSV Export:**
1. Navigate to `/inventory`
2. Optionally apply filters (make, status, aging)
3. Click "Export" — downloads `vehicles-export-YYYY-MM-DD.csv`

**Actions This Month:**
1. Navigate to `/` (dashboard)
2. "Actions This Month" card shows live count of vehicle actions in last 30 days

**Backend tests:** `cd backend && go test -race ./...`
**Frontend tests:** `cd frontend && npm test`
