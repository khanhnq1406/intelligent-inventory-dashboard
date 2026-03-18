# Fix: Actions Missing in Vehicle List Responses — Implementation Plan

> **For implementation:** Use the secure-feature-pipeline skill, step: implement

**Goal:** Populate the `actions` field in `GET /api/v1/vehicles` responses by adding a `LEFT JOIN LATERAL` to the `List` SQL query and mapping the result in the handler.

**Spec:** `docs/specs/2026-03-18-fix-actions-in-list-spec.md`

**Architecture:** Two targeted changes: (1) the repository `List` method gets a `LEFT JOIN LATERAL` to fetch the last 3 actions per vehicle; (2) the handler `ListVehicles` maps `v.Actions` onto the response, matching the pattern already used by `GetVehicle`. No OpenAPI changes, no migrations, no new components.

**Tech Stack:** Go + Chi + oapi-codegen + pgx | Next.js 14 + TanStack Query + shadcn/ui | PostgreSQL 16

---

## Security Implementation Notes

- No new parameters or user-controlled input — the lateral subquery binds only `v.id` (a DB-internal value).
- Dealership scoping remains unchanged via the existing `WHERE v.dealership_id = $N` condition.
- `ListAll` (CSV export) is intentionally left unchanged — adding actions there is out of scope.
- `notes` is nullable in `vehicle_actions`; use `*string` scan pattern (same as `GetByID`).

## C4 Architecture Diagram Updates

None. No new containers, components, or external integrations are introduced. The existing system design doc (`docs/plans/2026-03-17-system-design.md`) remains accurate.

## Runtime Flow Diagrams

None. The change is a single SQL query modification with no new branching logic, no new service coordination, and no additional error paths beyond what `GetByID` already documents.

---

## Task 1: Repository — Add Lateral Join to `List`

**Files:**
- Modify: `backend/internal/repository/vehicle.go` (lines 107–143, the `List` function)
- Test: `backend/internal/repository/vehicle_test.go` (create new)

**Security notes:** No new user input flows into the lateral subquery. The `vehicle_id` join condition is DB-internal. Nullable `notes` field must use `*string` scan to avoid nil-pointer panics.

---

### Step 1: Write the failing test

Create `backend/internal/repository/vehicle_test.go` with a unit test for the `List` SQL changes.

> **Note:** The repository uses a real pgxpool, so this is an integration test that requires a live DB. Write it as a build-tag-guarded integration test (`//go:build integration`). The important correctness property — that scanned rows include action fields — is verified without a real DB by testing the SQL construction helpers and the scan path via a mock.
>
> Since the full integration test requires Docker, write a **unit test** for the helpers that are safe to test in isolation (`buildConditions`, `validateSortColumn`, `validateSortOrder`), plus a **compilation check** that the new `listActionRow` struct is correct.

```go
// backend/internal/repository/vehicle_test.go
package repository

import (
	"testing"

	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

func TestBuildConditions_DealershipFilter(t *testing.T) {
	id := mustParseUUID("00000000-0000-0000-0000-000000000001")
	filters := models.VehicleFilters{DealershipID: &id}
	conditions, args := buildConditions(filters)
	if len(conditions) != 1 {
		t.Fatalf("expected 1 condition, got %d", len(conditions))
	}
	if len(args) != 1 {
		t.Fatalf("expected 1 arg, got %d", len(args))
	}
}

func TestBuildConditions_AgingFilter(t *testing.T) {
	aging := true
	filters := models.VehicleFilters{Aging: &aging}
	conditions, _ := buildConditions(filters)
	if len(conditions) != 1 {
		t.Fatalf("expected 1 condition, got %d", len(conditions))
	}
}

func TestValidateSortColumn_Whitelisted(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"stocked_at", "v.stocked_at"},
		{"price", "v.price"},
		{"year", "v.year"},
		{"make", "v.make"},
		{"invalid", "v.stocked_at"},   // default
		{"'; DROP TABLE vehicles; --", "v.stocked_at"}, // injection attempt defaults
	}
	for _, tt := range tests {
		got := validateSortColumn(tt.input)
		if got != tt.want {
			t.Errorf("validateSortColumn(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestValidateSortOrder(t *testing.T) {
	if got := validateSortOrder("asc"); got != "ASC" {
		t.Errorf("expected ASC, got %s", got)
	}
	if got := validateSortOrder("desc"); got != "DESC" {
		t.Errorf("expected DESC, got %s", got)
	}
	if got := validateSortOrder("invalid"); got != "DESC" {
		t.Errorf("expected DESC default, got %s", got)
	}
}

// mustParseUUID is a test helper.
func mustParseUUID(s string) (id interface{ String() string }) {
	// Use google/uuid
	return uuidFromString(s)
}
```

> **Simpler approach:** Because the test helpers already partially exist and the main correctness concern is that the SQL scan correctly handles the nullable `notes` field and the action columns, write a targeted test that exercises the scan struct directly.

Replace with this cleaner test file:

```go
// backend/internal/repository/vehicle_test.go
package repository

import (
	"testing"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

func TestBuildConditions_Empty(t *testing.T) {
	conditions, args := buildConditions(models.VehicleFilters{})
	if len(conditions) != 0 {
		t.Errorf("expected 0 conditions, got %d", len(conditions))
	}
	if len(args) != 0 {
		t.Errorf("expected 0 args, got %d", len(args))
	}
}

func TestBuildConditions_DealershipFilter(t *testing.T) {
	id := uuid.New()
	filters := models.VehicleFilters{DealershipID: &id}
	conditions, args := buildConditions(filters)
	if len(conditions) != 1 {
		t.Fatalf("expected 1 condition, got %d", len(conditions))
	}
	if len(args) != 1 {
		t.Fatalf("expected 1 arg, got %d", len(args))
	}
}

func TestBuildConditions_AgingFilter(t *testing.T) {
	aging := true
	filters := models.VehicleFilters{Aging: &aging}
	conditions, _ := buildConditions(filters)
	if len(conditions) != 1 {
		t.Fatalf("expected 1 condition, got %d", len(conditions))
	}
}

func TestValidateSortColumn(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"stocked_at", "v.stocked_at"},
		{"price", "v.price"},
		{"year", "v.year"},
		{"make", "v.make"},
		{"invalid", "v.stocked_at"},
		{"'; DROP TABLE vehicles; --", "v.stocked_at"},
	}
	for _, tt := range tests {
		got := validateSortColumn(tt.input)
		if got != tt.want {
			t.Errorf("validateSortColumn(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestValidateSortOrder(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"asc", "ASC"},
		{"desc", "DESC"},
		{"invalid", "DESC"},
		{"", "DESC"},
	}
	for _, tt := range tests {
		got := validateSortOrder(tt.input)
		if got != tt.want {
			t.Errorf("validateSortOrder(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}
```

### Step 2: Run test to verify it passes (these helpers are correct now — we're testing new behavior next)

```bash
cd backend && go test -v -race ./internal/repository/...
```

Expected: all helper tests pass.

### Step 3: Modify `List` in `backend/internal/repository/vehicle.go`

Replace the `List` function (lines 89–143). The changes are:

1. Add a `LEFT JOIN LATERAL` subquery to fetch the last 3 actions per vehicle.
2. Change `rows.Scan` to also read the action columns.
3. After scanning each vehicle row, collect the action rows into `v.Actions`.

**New `List` implementation:**

```go
func (r *pgxVehicle) List(ctx context.Context, filters models.VehicleFilters) ([]models.Vehicle, int, error) {
	conditions, args := buildConditions(filters)
	whereClause := buildWhereClause(conditions)

	// Count total matching rows
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM vehicles v %s", whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting vehicles: %w", err)
	}

	sortCol := validateSortColumn(filters.SortBy)
	sortOrder := validateSortOrder(filters.Order)

	// Pagination
	offset := (filters.Page - 1) * filters.PageSize
	argIdx := len(args) + 1

	// Main query — LEFT JOIN LATERAL fetches last 3 actions per vehicle.
	// The lateral subquery binds only v.id (DB-internal); no user input flows in.
	query := fmt.Sprintf(`
		SELECT v.id, v.dealership_id, v.make, v.model, v.year, v.vin, v.price, v.status,
		       v.stocked_at, v.created_at, v.updated_at,
		       EXTRACT(EPOCH FROM NOW() - v.stocked_at)::int / 86400 AS days_in_stock,
		       a.id        AS action_id,
		       a.action_type,
		       a.notes,
		       a.created_by,
		       a.created_at AS action_created_at
		FROM vehicles v
		LEFT JOIN LATERAL (
		    SELECT id, action_type, notes, created_by, created_at
		    FROM vehicle_actions
		    WHERE vehicle_id = v.id
		    ORDER BY created_at DESC
		    LIMIT 3
		) a ON true
		%s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d`,
		whereClause, sortCol, sortOrder, argIdx, argIdx+1)

	args = append(args, filters.PageSize, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("querying vehicles: %w", err)
	}
	defer rows.Close()

	// vehicleMap preserves insertion order while grouping action rows by vehicle ID.
	vehicleMap := make(map[uuid.UUID]*models.Vehicle)
	var vehicleOrder []uuid.UUID

	for rows.Next() {
		var v models.Vehicle
		// Nullable action fields — NULL when vehicle has no actions
		var (
			actionID        *uuid.UUID
			actionType      *string
			actionNotes     *string
			actionCreatedBy *string
			actionCreatedAt *time.Time
		)
		if err := rows.Scan(
			&v.ID, &v.DealershipID, &v.Make, &v.Model, &v.Year, &v.VIN, &v.Price, &v.Status,
			&v.StockedAt, &v.CreatedAt, &v.UpdatedAt, &v.DaysInStock,
			&actionID, &actionType, &actionNotes, &actionCreatedBy, &actionCreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scanning vehicle row: %w", err)
		}
		v.IsAging = v.DaysInStock > 90

		existing, seen := vehicleMap[v.ID]
		if !seen {
			v.Actions = []models.VehicleAction{}
			vehicleMap[v.ID] = &v
			vehicleOrder = append(vehicleOrder, v.ID)
			existing = vehicleMap[v.ID]
		}

		if actionID != nil {
			a := models.VehicleAction{
				ID:         *actionID,
				VehicleID:  existing.ID,
				ActionType: *actionType,
				CreatedBy:  *actionCreatedBy,
				CreatedAt:  *actionCreatedAt,
			}
			if actionNotes != nil {
				a.Notes = *actionNotes
			}
			existing.Actions = append(existing.Actions, a)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterating vehicle rows: %w", err)
	}

	vehicles := make([]models.Vehicle, 0, len(vehicleOrder))
	for _, id := range vehicleOrder {
		vehicles = append(vehicles, *vehicleMap[id])
	}
	return vehicles, total, nil
}
```

> **Important detail:** The `LEFT JOIN LATERAL` with `LIMIT 3` produces up to 3 rows per vehicle. We must group them back into one `models.Vehicle` per `v.id`. The `vehicleMap` + `vehicleOrder` pattern preserves the `ORDER BY` sort order while grouping.

> **`time` import:** Add `"time"` to the import block if not already present.

### Step 4: Run the tests to verify

```bash
cd backend && go test -v -race ./internal/repository/... && go vet ./...
```

Expected: all tests pass, `go vet` clean.

### Step 5: Commit

```bash
cd backend && git add internal/repository/vehicle.go internal/repository/vehicle_test.go
git commit -m "feat(repository): add LEFT JOIN LATERAL to List for last 3 actions per vehicle"
```

---

## Task 2: Handler — Map Actions in `ListVehicles`

**Files:**
- Modify: `backend/internal/handler/handler.go` (lines 104–115, the `ListVehicles` loop)
- Modify: `backend/internal/handler/handler_test.go` (update `TestListVehicles_Success` + add `TestListVehicles_IncludesActions`)

**Security notes:** No new user input. Actions are populated from the service layer, which already enforces dealership scoping at the repository level.

---

### Step 1: Write the failing test

Add a new test case in `handler_test.go` asserting that `ListVehicles` response items include their actions. Also update the existing `TestListVehicles_Success` fixture to include an action.

```go
func TestListVehicles_IncludesActions(t *testing.T) {
	vid := uuid.New()
	actionID := uuid.New()
	now := time.Now()
	price := 25000.0
	srv := NewServer(nil, nil,
		&mockVehicleService{
			paginatedVehicles: &models.PaginatedVehicles{
				Items: []models.Vehicle{
					{
						ID: vid, Make: "Honda", Model: "Civic", Year: 2023, VIN: "VIN123",
						Price: &price, Status: "available", StockedAt: now, DaysInStock: 30,
						Actions: []models.VehicleAction{
							{ID: actionID, VehicleID: vid, ActionType: "price_reduction", CreatedBy: "Manager", CreatedAt: now},
						},
					},
				},
				Total: 1, Page: 1, PageSize: 20, TotalPages: 1,
			},
		},
		nil, nil,
	)
	resp, err := srv.ListVehicles(context.Background(), ListVehiclesRequestObject{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	r, ok := resp.(ListVehicles200JSONResponse)
	if !ok {
		t.Fatalf("expected ListVehicles200JSONResponse, got %T", resp)
	}
	if len(r.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(r.Items))
	}
	item := r.Items[0]
	if item.Actions == nil {
		t.Fatal("expected Actions to be non-nil")
	}
	if len(*item.Actions) != 1 {
		t.Errorf("expected 1 action, got %d", len(*item.Actions))
	}
	if (*item.Actions)[0].Id != actionID {
		t.Errorf("expected action ID %v, got %v", actionID, (*item.Actions)[0].Id)
	}
}
```

### Step 2: Run test to verify it fails

```bash
cd backend && go test -v -race -run TestListVehicles_IncludesActions ./internal/handler/...
```

Expected: `FAIL` — `item.Actions == nil` because the handler doesn't map actions yet.

### Step 3: Update `ListVehicles` in `handler.go`

Replace lines 104–115 (the items loop):

**Before:**
```go
items := make([]Vehicle, 0, len(result.Items))
for _, v := range result.Items {
    items = append(items, modelVehicleToResponse(v))
}
```

**After:**
```go
items := make([]Vehicle, 0, len(result.Items))
for _, v := range result.Items {
    resp := modelVehicleToResponse(v)
    actions := make([]VehicleAction, 0, len(v.Actions))
    for _, a := range v.Actions {
        actions = append(actions, modelActionToResponse(a))
    }
    resp.Actions = &actions
    items = append(items, resp)
}
```

This mirrors the pattern already used in `GetVehicle` (lines 135–139).

### Step 4: Run tests to verify they pass

```bash
cd backend && go test -v -race ./internal/handler/... && go vet ./...
```

Expected: all tests pass including `TestListVehicles_IncludesActions`.

### Step 5: Run the full backend test suite

```bash
cd backend && go test -v -race ./...
```

Expected: all tests pass.

### Step 6: Commit

```bash
git add backend/internal/handler/handler.go backend/internal/handler/handler_test.go
git commit -m "feat(handler): map actions onto ListVehicles response items"
```

---

## Task 3: End-to-End Smoke Test (Manual)

**Files:** None changed.

**Goal:** Verify the fix works against a running stack.

### Step 1: Start the stack

```bash
docker compose up -d
```

### Step 2: Seed some actions (if needed)

If the database has vehicles but no actions, create one:

```bash
# Get a vehicle ID from the list
curl -s "http://localhost:8080/api/v1/vehicles?page_size=1" | jq '.items[0].id'

# Create an action
curl -s -X POST "http://localhost:8080/api/v1/vehicles/{id}/actions" \
  -H "Content-Type: application/json" \
  -d '{"action_type":"price_reduction","created_by":"Manager","notes":"Test action"}'
```

### Step 3: Verify list response includes actions

```bash
curl -s "http://localhost:8080/api/v1/vehicles?page_size=5" | jq '.items[].actions'
```

Expected: arrays (possibly empty `[]` for vehicles with no actions, non-empty for vehicles with actions).

### Step 4: Verify dashboard and aging pages in browser

- `http://localhost:3000` — Dashboard "Recent Actions" table should show actions.
- `http://localhost:3000/aging` — "Last Action" column should show action type (not always "No actions").
- `http://localhost:3000/inventory` — "Last Action" column should also reflect real data.

### Step 5: Commit progress file

```bash
git add docs/reports/2026-03-18-fix-actions-in-list-progress.md
git commit -m "docs: update progress file — all tasks complete"
```

---

## Summary

| Task | Files | Tests | Description |
|------|-------|-------|-------------|
| 1 | `repository/vehicle.go`, `repository/vehicle_test.go` | Unit (helper funcs) | Add `LEFT JOIN LATERAL` to `List`, group rows by vehicle ID |
| 2 | `handler/handler.go`, `handler/handler_test.go` | Unit (mock service) | Map `v.Actions` onto `ListVehicles` response items |
| 3 | — | Manual smoke test | Verify end-to-end with running stack |

**Task dependency:** Task 2 depends on Task 1 (the handler maps what the repository now returns). They touch different files, but should be implemented in order to avoid confusion.

**No frontend changes needed.** The frontend already reads `v.actions` correctly — it just receives an empty/absent field today.

**No OpenAPI changes.** The `actions` field already exists on the `Vehicle` schema.

**No migrations.** `vehicle_actions` table and `vehicles` table schemas are unchanged.
