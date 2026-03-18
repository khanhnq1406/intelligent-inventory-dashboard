# Add Vehicle, CSV Export & Actions This Month — Implementation Progress

## Metadata
- **Feature:** Add Vehicle, CSV Export & Actions This Month
- **Plan file:** `docs/plans/2026-03-18-add-vehicle-export-plan.md`
- **Spec file:** `docs/specs/2026-03-17-add-vehicle-export-spec.md`
- **Started:** 2026-03-18T00:00:00Z
- **Last updated:** 2026-03-18T09:45:00Z
- **Current state:** completed
- **Current task:** done

## Task Progress

| # | Task Name | Status | Commit | Summary |
|---|-----------|--------|--------|---------|
| 0 | Update C4 & Runtime Flow Diagrams | done | bd2b979 | Updated system-design.md: L3 diagrams, create vehicle + CSV export sequence diagrams |
| 1 | Update OpenAPI Spec + Run make generate | done | 479de06 | Added POST /vehicles, GET /vehicles/export, CreateVehicleRequest, actions_this_month |
| 2 | Add CreateVehicleInput Model | done | b47a2f8 | Added CreateVehicleInput struct and ActionsThisMonth to DashboardSummary |
| 3 | Add Create() to VehicleRepository | done | b526d4e | Added Create, ListAll, GetByID; ErrDuplicateVIN sentinel; refactored helpers |
| 4 | Add ListAll() to VehicleRepository + ExportCSV() to VehicleService | done | b526d4e | ListAll in repo, ExportCSV in service with 10K cap |
| 5 | Add Create() to VehicleService | done | 8516adc | Create() with full validation, dealership check, cache invalidation |
| 6 | Update Dashboard Repository for actions_this_month | done | 8516adc | Added COUNT query for last 30 days actions |
| 7 | Add CreateVehicle and ExportVehicles HTTP Handlers | done | 59cc3fd | CreateVehicle (409 for dup VIN), ExportVehicles (custom CSV response type) |
| 8 | Update GetDashboardSummary Handler | done | 59cc3fd | Mapped ActionsThisMonth to API response |
| 9 | Install shadcn Dialog, Input, Label, Select Components | done | 5be3afc | Installed 4 shadcn UI components |
| 10 | Add useCreateVehicle and useDealerships Hooks | done | 5be3afc | Added both TanStack Query hooks with cache invalidation |
| 11 | Build AddVehicleModal Component | done | 5be3afc | Full form: dealership, make, model, year, price, VIN, status, stocked_at |
| 12 | Wire Up Inventory Page | done | 5be3afc | Export button with CSV download + error, Add Vehicle button + modal |
| 13 | Update Dashboard Page for actions_this_month | done | 5be3afc | Replaced "-" placeholder with live summary.actions_this_month |
| 14 | Backend Service Tests | done | 123ee09 | 17 subtests: Create validation, dealership check, dup VIN, cache, ExportCSV |
| 15 | Frontend Component Tests for AddVehicleModal | done | 5e7367c | 11 tests: open/closed state, validation, VIN uppercase, pending, error, cancel |

**Status values:** `pending` | `in_progress` | `done` | `skipped`

## Resume Instructions

All tasks are complete. See implementation report at `docs/reports/2026-03-18-add-vehicle-export-report.md`.

## Notes

- Custom `exportCSVResponse` type used because oapi-codegen's generated type doesn't support Content-Disposition header
- `@base-ui/react/dialog` Portal requires mocking at `@/components/ui/dialog` level in tests (not at base-ui level)
- `inventory.test.tsx` needed mocks for `useCreateVehicle` and `useDealerships` after AddVehicleModal was wired in
