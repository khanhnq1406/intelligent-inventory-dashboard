# Add Vehicle, CSV Export & Actions This Month Specification

## Summary

Implement three "coming soon" features that complete the core CRUD and reporting capabilities of the Intelligent Inventory Dashboard: (1) a Create Vehicle endpoint and frontend form enabling dealership managers to add new vehicles to inventory, (2) a server-side CSV export endpoint for filtered vehicle data, and (3) an "Actions This Month" metric on the dashboard summary. All three require OpenAPI spec changes, backend implementation, and frontend integration.

## User Stories

- As a dealership manager, I want to add a new vehicle to inventory through the dashboard so that I can track it from day one without manual database entry.
- As a dealership manager, I want to export my filtered vehicle inventory as a CSV file so that I can share it with partners, import into other systems, or create offline reports.
- As a dealership manager, I want to see how many actions were taken this month on the dashboard so that I can measure team activity and responsiveness to aging stock.

## Functional Requirements

### FR-1: Create Vehicle (POST /api/v1/vehicles)

Add a new REST endpoint and frontend modal form to create vehicles.

**API Design:**
- Method: `POST /api/v1/vehicles`
- Operation ID: `createVehicle`
- Request body: `CreateVehicleRequest` (JSON)
- Success response: `201 Created` with the created `Vehicle` object
- Error responses: `400 Bad Request` (validation), `409 Conflict` (duplicate VIN), `500 Internal Server Error`

**Request schema — `CreateVehicleRequest`:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `dealership_id` | string (UUID) | Yes | Must reference existing dealership |
| `make` | string | Yes | 1-100 characters |
| `model` | string | Yes | 1-100 characters |
| `year` | integer | Yes | 1900-2100 |
| `vin` | string | Yes | Exactly 17 characters, pattern: `^[A-HJ-NPR-Z0-9]{17}$` |
| `price` | number (double) | No | >= 0, max 10,000,000 |
| `status` | string (enum) | Yes | `available`, `sold`, `reserved` |
| `stocked_at` | string (date-time) | No | Defaults to current timestamp if omitted |

**Backend layers:**
- Repository: `VehicleRepository.Create(ctx, vehicle) (*Vehicle, error)` — INSERT with RETURNING clause
- Service: `VehicleService.Create(ctx, input) (*Vehicle, error)` — validates all fields, checks dealership exists, checks VIN uniqueness, invalidates dashboard cache
- Handler: `CreateVehicle` — maps request to service input, returns 201/400/409/500

**Frontend — Add Vehicle Modal:**
- Trigger: "Add Vehicle" button on `/inventory` page (currently disabled)
- Modal dialog with form fields matching the schema above
- Dealership field: dropdown populated from `GET /api/v1/dealerships`
- Status field: dropdown with available/sold/reserved options
- Year field: number input with min/max constraints
- VIN field: text input with uppercase enforcement and 17-char validation
- Price field: number input (optional), formatted as currency
- Stocked At field: date picker, defaults to today
- Submit calls `POST /api/v1/vehicles`, on success closes modal, invalidates vehicle list + dashboard queries
- New hook: `useCreateVehicle()` — `useMutation` for POST /api/v1/vehicles
- New hook: `useDealerships()` — `useQuery` for GET /api/v1/dealerships (for dropdown)

**Acceptance criteria:**
- [ ] OpenAPI spec updated with `createVehicle` operation and `CreateVehicleRequest` schema
- [ ] `make generate` produces valid Go and TypeScript types
- [ ] Backend validates all fields server-side (make, model, year, VIN format, price range, status enum, dealership existence)
- [ ] Duplicate VIN returns 409 Conflict
- [ ] Backend service invalidates dashboard cache on vehicle creation
- [ ] Frontend modal form renders with all 7 fields
- [ ] Dealership dropdown populated from API
- [ ] VIN input auto-uppercases and shows error if not 17 valid characters
- [ ] Form submission creates vehicle and refreshes inventory list
- [ ] Loading and error states handled in form

### FR-2: Export Vehicles as CSV (GET /api/v1/vehicles/export)

Add a backend endpoint that generates CSV files from filtered vehicle data.

**API Design:**
- Method: `GET /api/v1/vehicles/export`
- Operation ID: `exportVehicles`
- Query parameters: Same filter set as `listVehicles` (dealership_id, make, model, status, aging, sort_by, order) — NO pagination params
- Success response: `200 OK` with `Content-Type: text/csv` and `Content-Disposition: attachment; filename="vehicles-export-YYYY-MM-DD.csv"`
- Error responses: `400 Bad Request`, `500 Internal Server Error`

**CSV columns:**

| Column | Source |
|--------|--------|
| ID | vehicle.id |
| VIN | vehicle.vin |
| Make | vehicle.make |
| Model | vehicle.model |
| Year | vehicle.year |
| Price | vehicle.price (empty if null) |
| Status | vehicle.status |
| Stocked At | vehicle.stocked_at (ISO 8601) |
| Days in Stock | vehicle.days_in_stock (computed) |
| Is Aging | vehicle.is_aging (true/false) |
| Created At | vehicle.created_at (ISO 8601) |

**Backend layers:**
- Repository: Reuse existing `VehicleRepository.List(ctx, filters)` — without pagination limits (set page_size to max or add a dedicated method)
- Service: `VehicleService.ExportCSV(ctx, filters) ([]byte, error)` — fetches all matching vehicles, encodes as CSV using `encoding/csv`
- Handler: `ExportVehicles` — sets response headers (`Content-Type`, `Content-Disposition`), writes CSV bytes

**Frontend — Export Button:**
- Trigger: "Export" button on `/inventory` page (currently disabled)
- Passes current filter state as query params
- Opens download via `window.location.href` or `fetch` + `Blob` + `URL.createObjectURL`
- Shows loading spinner on button during export
- No new TanStack Query hook needed (direct download, not cached data)

**Acceptance criteria:**
- [ ] OpenAPI spec updated with `exportVehicles` operation
- [ ] CSV includes all 11 columns with proper headers
- [ ] Filters apply correctly (same as list endpoint)
- [ ] No pagination — exports ALL matching vehicles
- [ ] Response has correct `Content-Type: text/csv` header
- [ ] Response has `Content-Disposition: attachment; filename="vehicles-export-YYYY-MM-DD.csv"` header
- [ ] Frontend Export button triggers download with current filters
- [ ] Loading state shown while export generates
- [ ] Large exports (1000+ vehicles) handled without timeout

### FR-3: Actions This Month Dashboard Metric

Add an `actions_this_month` field to the dashboard summary.

**API Design:**
- Modify existing `DashboardSummary` schema — add `actions_this_month: integer`
- No new endpoint — enhances `GET /api/v1/dashboard/summary`

**Backend layers:**
- Repository: Modify `DashboardRepository.GetSummary(ctx)` query to include `COUNT(*) FROM vehicle_actions WHERE created_at >= NOW() - INTERVAL '30 days'`
- Service: No changes needed (passes through from repository)
- Handler: Map new field to response

**Frontend:**
- Update dashboard page: Replace `<StatsCard title="Actions This Month" value="-" description="Coming soon" />` with live data from `summary.actions_this_month`
- Show green color when value > 0, neutral otherwise
- Update `DashboardSummary` type (auto-generated from OpenAPI)

**Acceptance criteria:**
- [ ] OpenAPI spec updated with `actions_this_month` in `DashboardSummary`
- [ ] Backend counts actions from the last 30 days
- [ ] Dashboard stats card shows real count instead of "Coming soon"
- [ ] Count updates when new actions are created (via cache invalidation)

## Non-Functional Requirements

- **Performance**: CSV export must complete within 10 seconds for up to 10,000 vehicles. Create Vehicle response within 500ms.
- **Security**: All inputs validated server-side. VIN uniqueness enforced at database level (UNIQUE constraint). Price cannot be negative. Dealership must exist before vehicle creation.
- **Data integrity**: Dashboard cache invalidated on vehicle creation. VIN uniqueness enforced at both service and database layers (defense in depth).

## Architecture Changes (C4)

### Diagrams to Update
- **L3 Backend Component diagram** in `docs/plans/2026-03-17-system-design.md`: Add `Create()` method to VehicleRepository and VehicleService interfaces. Add `ExportCSV()` to VehicleService.
- **L3 Frontend Component diagram**: Add `AddVehicleModal` component, `useCreateVehicle` hook, `useDealerships` hook.

### New Diagrams
None required — all changes are within existing containers.

## Runtime Flow Diagrams

### New Flow Diagrams

**1. Create Vehicle Flow** — `sequenceDiagram`
- Trigger: User submits Add Vehicle form
- Flow: Frontend → POST /api/v1/vehicles → Handler → Service (validate) → Repository (INSERT) → Response
- Error paths: validation failure (400), duplicate VIN (409), dealership not found (400)
- Target: Add to `docs/plans/2026-03-17-system-design.md`

**2. CSV Export Flow** — `sequenceDiagram`
- Trigger: User clicks Export button with active filters
- Flow: Frontend → GET /api/v1/vehicles/export?filters → Handler → Service (fetch all + encode CSV) → Response (binary)
- Error paths: invalid filters (400), timeout on large dataset
- Target: Add to `docs/plans/2026-03-17-system-design.md`

## Data Model Changes

No new tables. Modifications:

- `CreateVehicleRequest` schema added to OpenAPI (maps to existing `vehicles` table)
- `DashboardSummary` schema gains `actions_this_month` field (computed from `vehicle_actions`)
- `CreateVehicleInput` model added to `backend/internal/models/models.go`

## API Changes

| Change | Endpoint | Method | Description |
|--------|----------|--------|-------------|
| New | `/api/v1/vehicles` | POST | Create a new vehicle |
| New | `/api/v1/vehicles/export` | GET | Export filtered vehicles as CSV |
| Modified | `/api/v1/dashboard/summary` | GET | Added `actions_this_month` to response |

All changes go to `api/openapi.yaml` first, then `make generate`.

## UI/UX Changes

### Existing Component Inventory (REQUIRED)

| Need | Existing Component | Location |
|------|--------------------|----------|
| Modal dialog | None (NEW — need dialog/modal) | Need to add shadcn Dialog |
| Form inputs | None (NEW — need Input, Select, Label) | Need to add shadcn Input, Select, Label |
| Button variants | Button | `components/ui/button.tsx` |
| Card containers | Card | `components/ui/card.tsx` |
| Status badges | StatusBadge | `components/status-badge.tsx` |
| Stats display | StatsCard | `components/stats-card.tsx` |
| Date picker | None (NEW) | Need to add date input (native HTML or shadcn) |

### New Components

| Component | Location | Justification |
|-----------|----------|---------------|
| AddVehicleModal | `components/add-vehicle-modal.tsx` | Dialog form for creating vehicles. No existing modal/dialog component. |
| Dialog (shadcn) | `components/ui/dialog.tsx` | shadcn dialog primitive — needed for modal pattern |
| Input (shadcn) | `components/ui/input.tsx` | shadcn input primitive — needed for form fields |
| Label (shadcn) | `components/ui/label.tsx` | shadcn label primitive — needed for form accessibility |
| Select (shadcn) | `components/ui/select.tsx` | shadcn select primitive — needed for dropdowns |

### New Hooks

| Hook | Location | Purpose |
|------|----------|---------|
| useCreateVehicle | `hooks/use-create-vehicle.ts` | Mutation: POST /api/v1/vehicles |
| useDealerships | `hooks/use-dealerships.ts` | Query: GET /api/v1/dealerships (for dropdown) |

### Frontend Design Specs

**Add Vehicle Modal:**
- Triggered by blue "Add Vehicle" button (top-right of inventory page)
- Overlay: semi-transparent black backdrop
- Dialog: white card, rounded-xl, max-width 560px, padding 24px
- Title: "Add New Vehicle" Inter 20px bold
- Form layout: 2-column grid for compact fields, full-width for VIN
  - Row 1: Dealership (full-width select)
  - Row 2: Make (half) + Model (half)
  - Row 3: Year (half) + Price (half)
  - Row 4: VIN (full-width, monospace font)
  - Row 5: Status (half) + Stocked At (half, date input)
- Buttons: "Cancel" (outline) + "Add Vehicle" (blue, full) right-aligned
- Validation: inline error messages below each field
- Loading: button shows spinner + "Adding..." text during submission
- Success: close modal, show success toast/notification, refresh vehicle list

**Export Button:**
- Same position as current disabled button
- While exporting: button shows spinner + "Exporting..."
- After download starts: button returns to normal state
- If error: show inline error message near button

## Security & Risk Assessment

### Data Flow Diagram

| # | Source | Data | Trust Boundary Crossed? | Destination | Notes |
|---|--------|------|------------------------|-------------|-------|
| 1 | Browser | Create Vehicle form data (JSON) | Yes: Internet → App | Go Handler | Untrusted input — all fields need validation |
| 2 | Go Handler | Parsed CreateVehicleRequest | No (same tier) | Vehicle Service | Validated by oapi-codegen + service |
| 3 | Vehicle Service | Validated vehicle model | Yes: App → DB | PostgreSQL | pgx parameterized INSERT |
| 4 | PostgreSQL | Created vehicle row | Yes: DB → App | Vehicle Service | Trusted response |
| 5 | Go Handler | Vehicle JSON response | Yes: App → Internet | Browser | Response data |
| 6 | Browser | Export filter params (query string) | Yes: Internet → App | Go Handler | Untrusted input — validation needed |
| 7 | Go Handler | CSV bytes | Yes: App → Internet | Browser | File download |
| 8 | Browser | Dashboard summary request | Yes: Internet → App | Go Handler | Read-only, no input |

### Trust Boundaries

| Boundary | Crossed By | Security Control |
|----------|-----------|-----------------|
| Internet → App | Create vehicle form, export params | oapi-codegen validation + service layer validation |
| App → DB | INSERT vehicle, SELECT for export | pgx parameterized queries, UNIQUE constraint on VIN |
| App → Internet | Vehicle JSON, CSV file, dashboard JSON | No sensitive data leakage, no internal errors exposed |

### Threats Identified (STRIDE per boundary crossing)

| # | Data Flow | Boundary | STRIDE | Threat | Severity | Mitigation |
|---|-----------|----------|--------|--------|----------|------------|
| T-1 | 1 | Internet → App | Tampering | Malicious form data (XSS in make/model, SQL in VIN) | Medium | oapi-codegen validates types + lengths; pgx parameterized queries prevent SQL injection; React text rendering prevents XSS |
| T-2 | 1 | Internet → App | Tampering | Negative price, year 0, invalid status | Medium | Service layer validates ranges; OpenAPI constraints enforced |
| T-3 | 1 | Internet → App | Tampering | Duplicate VIN to overwrite existing vehicle | Medium | UNIQUE constraint on vehicles.vin column + service checks |
| T-4 | 1 | Internet → App | Tampering | Reference non-existent dealership_id | Low | Service layer checks dealership exists before INSERT |
| T-5 | 1 | Internet → App | Spoofing | Create vehicle for another dealership | Medium | No auth in v1 — documented risk. Future: JWT with dealership claim |
| T-6 | 6 | Internet → App | DoS | Export request for entire database (no filters) | Medium | Consider max export limit (e.g., 10,000 records). Add timeout. |
| T-7 | 6 | Internet → App | Tampering | Manipulate sort_by param to inject SQL | Low | Sort column whitelist enforced in service + repository |
| T-8 | 7 | App → Internet | Info Disclosure | CSV contains data from all dealerships | Medium | No auth in v1 — all data accessible. Future: dealership-scoped export |
| T-9 | 3 | App → DB | Tampering | Backdate stocked_at to avoid aging flags | Low | Allow backdating (legitimate for transfers). Service validates timestamp is not in the future. |
| T-10 | 1 | Internet → App | Repudiation | Vehicle created without audit trail | Low | vehicles table has created_at timestamp. Consider logging to vehicle_actions. |

### Authorization Rules

- No authentication in v1 (documented scope limitation)
- All endpoints publicly accessible
- Future: JWT-based auth with dealership_id claim, resource ownership checks

### Input Validation Rules

| Field | Validation | Layer |
|-------|-----------|-------|
| dealership_id | Valid UUID, must exist in dealerships table | Service |
| make | 1-100 chars, trimmed, not empty | Service + OpenAPI |
| model | 1-100 chars, trimmed, not empty | Service + OpenAPI |
| year | 1900-2100 integer | Service + OpenAPI |
| vin | Exactly 17 chars, pattern `^[A-HJ-NPR-Z0-9]{17}$`, unique | Service + OpenAPI + DB |
| price | Optional, >= 0, <= 10,000,000 | Service + OpenAPI |
| status | Enum: available, sold, reserved | Service + OpenAPI |
| stocked_at | Valid ISO 8601 datetime, not in the future | Service |
| Export filters | Same as listVehicles (validated by OpenAPI) | OpenAPI + Service |

### External Dependency Risks

| Dependency | Risk | Mitigation |
|------------|------|-----------|
| `encoding/csv` (Go stdlib) | None — part of standard library | N/A |
| shadcn Dialog/Input/Select/Label | Low — well-maintained, widely used | Pin versions in package-lock.json |
| No new external APIs | N/A | N/A |

### Sensitive Data Handling

- No PII beyond names in `created_by` field (existing)
- VINs are public identifiers in dealership context
- CSV export contains same data as web UI — no additional exposure
- Prices are business-confidential but no auth layer to protect them (v1 scope)

### Issues & Risks Summary

1. **No authentication** — any user can create vehicles or export data for any dealership. Acceptable per v1 scope, must be addressed before production.
2. **Export DoS potential** — unfiltered export could return entire database. Mitigate with record limit (10,000) and request timeout.
3. **Stocked_at backdating** — users can set past dates. Legitimate for vehicle transfers, but could be used to avoid aging flags. Future: audit log for stocked_at changes.
4. **No rate limiting on create** — rapid vehicle creation could flood the database. Low risk for dealership context, but should be added with auth layer.

## Edge Cases & Error Handling

| Scenario | Handling |
|----------|---------|
| Duplicate VIN on create | Return 409 Conflict with message "A vehicle with this VIN already exists" |
| Non-existent dealership_id | Return 400 Bad Request with message "Dealership not found" |
| Price exactly 0 | Allow (valid for trade-ins or donated vehicles) |
| stocked_at in the future | Return 400 Bad Request with message "Stocked date cannot be in the future" |
| VIN with lowercase letters | Auto-uppercase in frontend; backend accepts uppercase only (pattern validation) |
| Empty export (no matching vehicles) | Return 200 with CSV containing only headers row |
| Export with 10,000+ matches | Return first 10,000 rows with a warning header or reject with 400 |
| Dashboard cache stale after create | Dashboard cache invalidated on vehicle creation (same pattern as action creation) |
| Network error during form submit | Show inline error, keep form state for retry |
| Modal closed during submission | Cancel the mutation (TanStack Query handles this) |

## Dependencies & Assumptions

- **Dependencies**: shadcn/ui Dialog, Input, Select, Label components (to be installed via `npx shadcn@latest add`)
- **Assumptions**: Backend API running, database migrated, existing UNIQUE constraint on `vehicles.vin` column. All existing endpoints working correctly.

## Out of Scope

- Authentication / authorization
- Vehicle image uploads
- Bulk vehicle import (CSV upload)
- Vehicle update (PUT/PATCH endpoint)
- Vehicle delete endpoint
- Model-specific filtering in export (model filter already exists in list)
- Real-time notifications for new vehicles
