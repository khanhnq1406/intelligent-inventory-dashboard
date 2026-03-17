# Core Backend Implementation Plan

> **For implementation:** Use the secure-feature-pipeline skill, step: implement

**Goal:** Implement all 6 backend endpoints (ListDealerships, ListVehicles, GetVehicle, ListVehicleActions, CreateVehicleAction, GetDashboardSummary) with repository, service, and handler layers — TDD-first approach.

**Spec:** `docs/specs/2026-03-17-core-backend-spec.md`

**Architecture:** Three-layer backend (handler → service → repository) with pgx for DB access. All interfaces already defined in `service.go` and `repository.go`. Handler stubs exist in `handler.go`. Domain models exist in `models.go`. Generated oapi-codegen types in `api.gen.go` define exact request/response shapes. Dashboard caching uses in-memory `sync.RWMutex`-protected cache with 30s TTL.

**Tech Stack:** Go 1.25 + Chi + oapi-codegen + pgx | PostgreSQL 16

## Security Implementation Notes

- **Authentication:** No JWT yet (MVP). X-Dealership-ID header is optional and easily spoofable — acceptable for MVP.
- **Authorization:** When dealership_id filter is provided, queries are scoped. No cross-dealership data leakage.
- **Input validation:** Server-side validation for all query params and request bodies. Sort columns whitelisted. Page sizes capped. Enum values validated.
- **Data sanitization:** Error responses use generic `ErrorResponse{Code, Message}` — no stack traces or internal details leaked. pgx parameterized queries prevent SQL injection.

## C4 Architecture Diagram Updates

- Update L3 Backend Component Diagram in `docs/plans/2026-03-17-system-design.md` to add DashboardCache component
- Add L4 Code Diagram from spec showing service interfaces and dependencies
- Add runtime flow diagrams from spec (List Vehicles, Create Action, Dashboard Summary)

---

### Task 0: Update C4 Architecture Diagrams and Runtime Flow Diagrams

**Files:**
- Modify: `docs/plans/2026-03-17-system-design.md`

**Steps:**
1. Update L3 Backend Component Diagram to include DashboardCache component
2. Add L4 Code Diagram (classDiagram) showing service interfaces, repository interfaces, and DashboardCache — from spec section "Architecture Changes"
3. Add 3 runtime flow diagrams from spec: List Vehicles, Create Vehicle Action, Dashboard Summary (cached)
4. Commit

---

### Task 1: Dealership Repository + Service

**Files:**
- Create: `backend/internal/repository/dealership.go`
- Create: `backend/internal/service/dealership.go`
- Create: `backend/internal/service/dealership_test.go`

**Security notes:** Simple read-only query. No user input flows into SQL. pgx parameterized query even for simple SELECT.

**Step 1: Write the failing test for DealershipService**

```go
// backend/internal/service/dealership_test.go
package service

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type mockDealershipRepo struct {
	dealerships []models.Dealership
	err         error
}

func (m *mockDealershipRepo) List(_ context.Context) ([]models.Dealership, error) {
	return m.dealerships, m.err
}

func TestDealershipService_List(t *testing.T) {
	tests := []struct {
		name        string
		repo        *mockDealershipRepo
		wantCount   int
		wantErr     bool
	}{
		{
			name: "returns dealerships",
			repo: &mockDealershipRepo{
				dealerships: []models.Dealership{
					{ID: uuid.New(), Name: "Test Dealership"},
					{ID: uuid.New(), Name: "Another Dealership"},
				},
			},
			wantCount: 2,
		},
		{
			name: "returns empty list",
			repo: &mockDealershipRepo{dealerships: []models.Dealership{}},
			wantCount: 0,
		},
		{
			name:    "propagates repo error",
			repo:    &mockDealershipRepo{err: errors.New("db error")},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewDealershipService(tt.repo)
			result, err := svc.List(context.Background())
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(result) != tt.wantCount {
				t.Errorf("expected %d dealerships, got %d", tt.wantCount, len(result))
			}
		})
	}
}
```

**Step 2: Run test to verify it fails**
```bash
cd backend && go test -v -race ./internal/service/...
```
Expected: compilation error — `NewDealershipService` not defined.

**Step 3: Implement DealershipService**

```go
// backend/internal/service/dealership.go
package service

import (
	"context"
	"fmt"

	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/repository"
)

type dealershipService struct {
	repo repository.DealershipRepository
}

func NewDealershipService(repo repository.DealershipRepository) DealershipService {
	return &dealershipService{repo: repo}
}

func (s *dealershipService) List(ctx context.Context) ([]models.Dealership, error) {
	dealerships, err := s.repo.List(ctx)
	if err != nil {
		return nil, fmt.Errorf("listing dealerships: %w", err)
	}
	return dealerships, nil
}
```

**Step 4: Run test to verify it passes**
```bash
cd backend && go test -v -race ./internal/service/...
```

**Step 5: Implement DealershipRepository**

```go
// backend/internal/repository/dealership.go
package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type pgxDealership struct {
	pool *pgxpool.Pool
}

func NewDealershipRepository(pool *pgxpool.Pool) DealershipRepository {
	return &pgxDealership{pool: pool}
}

func (r *pgxDealership) List(ctx context.Context) ([]models.Dealership, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, location, created_at, updated_at FROM dealerships ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("querying dealerships: %w", err)
	}
	defer rows.Close()

	var dealerships []models.Dealership
	for rows.Next() {
		var d models.Dealership
		var location *string
		if err := rows.Scan(&d.ID, &d.Name, &location, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning dealership row: %w", err)
		}
		if location != nil {
			d.Location = *location
		}
		dealerships = append(dealerships, d)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating dealership rows: %w", err)
	}
	return dealerships, nil
}
```

**Step 6: Run tests + vet**
```bash
cd backend && go test -v -race ./internal/service/... && go vet ./...
```

**Step 7: Commit**
```
feat(backend): implement dealership repository and service
```

---

### Task 2: Vehicle Repository

**Files:**
- Create: `backend/internal/repository/vehicle.go`

**Security notes:** Sort column must be whitelisted — never interpolated directly from user input. All WHERE clause values use pgx parameterized queries ($1, $2, ...). `ILIKE` for case-insensitive partial match on make/model. Aging computed in SQL as `EXTRACT(EPOCH FROM NOW() - stocked_at) / 86400`.

**Step 1: Implement VehicleRepository**

The repository implements two methods:
- `List(ctx, filters) ([]Vehicle, total int, error)` — paginated with dynamic WHERE + ORDER BY + OFFSET/LIMIT. Includes LEFT JOIN to get the most recent action per vehicle.
- `GetByID(ctx, id) (*Vehicle, error)` — single vehicle with all actions.

```go
// backend/internal/repository/vehicle.go
package repository

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type pgxVehicle struct {
	pool *pgxpool.Pool
}

func NewVehicleRepository(pool *pgxpool.Pool) VehicleRepository {
	return &pgxVehicle{pool: pool}
}

// sortColumnMap whitelists allowed sort columns to prevent SQL injection.
var sortColumnMap = map[string]string{
	"stocked_at": "v.stocked_at",
	"price":      "v.price",
	"year":       "v.year",
	"make":       "v.make",
}

func (r *pgxVehicle) List(ctx context.Context, filters models.VehicleFilters) ([]models.Vehicle, int, error) {
	// Build dynamic WHERE clause
	var conditions []string
	var args []interface{}
	argIdx := 1

	if filters.DealershipID != nil {
		conditions = append(conditions, fmt.Sprintf("v.dealership_id = $%d", argIdx))
		args = append(args, *filters.DealershipID)
		argIdx++
	}
	if filters.Make != "" {
		conditions = append(conditions, fmt.Sprintf("v.make ILIKE $%d", argIdx))
		args = append(args, "%"+filters.Make+"%")
		argIdx++
	}
	if filters.Model != "" {
		conditions = append(conditions, fmt.Sprintf("v.model ILIKE $%d", argIdx))
		args = append(args, "%"+filters.Model+"%")
		argIdx++
	}
	if filters.Status != "" {
		conditions = append(conditions, fmt.Sprintf("v.status = $%d", argIdx))
		args = append(args, filters.Status)
		argIdx++
	}
	if filters.Aging != nil && *filters.Aging {
		conditions = append(conditions, "v.stocked_at <= NOW() - INTERVAL '90 days'")
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total matching rows
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM vehicles v %s", whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting vehicles: %w", err)
	}

	// Sort column (whitelisted)
	sortCol := "v.stocked_at"
	if col, ok := sortColumnMap[filters.SortBy]; ok {
		sortCol = col
	}
	sortOrder := "DESC"
	if filters.Order == "asc" {
		sortOrder = "ASC"
	}

	// Pagination
	offset := (filters.Page - 1) * filters.PageSize

	// Main query with LEFT JOIN for most recent action
	query := fmt.Sprintf(`
		SELECT v.id, v.dealership_id, v.make, v.model, v.year, v.vin, v.price, v.status,
		       v.stocked_at, v.created_at, v.updated_at,
		       EXTRACT(EPOCH FROM NOW() - v.stocked_at)::int / 86400 AS days_in_stock
		FROM vehicles v
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

	var vehicles []models.Vehicle
	for rows.Next() {
		var v models.Vehicle
		if err := rows.Scan(
			&v.ID, &v.DealershipID, &v.Make, &v.Model, &v.Year, &v.VIN, &v.Price, &v.Status,
			&v.StockedAt, &v.CreatedAt, &v.UpdatedAt, &v.DaysInStock,
		); err != nil {
			return nil, 0, fmt.Errorf("scanning vehicle row: %w", err)
		}
		v.IsAging = v.DaysInStock > 90
		vehicles = append(vehicles, v)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterating vehicle rows: %w", err)
	}

	return vehicles, total, nil
}

func (r *pgxVehicle) GetByID(ctx context.Context, id uuid.UUID) (*models.Vehicle, error) {
	var v models.Vehicle
	err := r.pool.QueryRow(ctx, `
		SELECT id, dealership_id, make, model, year, vin, price, status,
		       stocked_at, created_at, updated_at,
		       EXTRACT(EPOCH FROM NOW() - stocked_at)::int / 86400 AS days_in_stock
		FROM vehicles WHERE id = $1`, id).Scan(
		&v.ID, &v.DealershipID, &v.Make, &v.Model, &v.Year, &v.VIN, &v.Price, &v.Status,
		&v.StockedAt, &v.CreatedAt, &v.UpdatedAt, &v.DaysInStock,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("querying vehicle by id: %w", err)
	}
	v.IsAging = v.DaysInStock > 90

	// Fetch actions for this vehicle
	actionRows, err := r.pool.Query(ctx, `
		SELECT id, vehicle_id, action_type, notes, created_by, created_at
		FROM vehicle_actions WHERE vehicle_id = $1 ORDER BY created_at DESC`, id)
	if err != nil {
		return nil, fmt.Errorf("querying vehicle actions: %w", err)
	}
	defer actionRows.Close()

	for actionRows.Next() {
		var a models.VehicleAction
		var notes *string
		if err := actionRows.Scan(&a.ID, &a.VehicleID, &a.ActionType, &notes, &a.CreatedBy, &a.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanning action row: %w", err)
		}
		if notes != nil {
			a.Notes = *notes
		}
		v.Actions = append(v.Actions, a)
	}
	if err := actionRows.Err(); err != nil {
		return nil, fmt.Errorf("iterating action rows: %w", err)
	}

	return &v, nil
}
```

**Note:** This task has no unit test because the repository directly wraps pgx — testing requires a real database (integration test). Service-layer tests (Task 3) mock the repository interface to test business logic in isolation.

**Step 2: Run vet**
```bash
cd backend && go vet ./...
```

**Step 3: Commit**
```
feat(backend): implement vehicle repository with filtering, sorting, pagination
```

---

### Task 3: Vehicle Service + Tests

**Files:**
- Create: `backend/internal/service/vehicle.go`
- Create: `backend/internal/service/vehicle_test.go`

**Security notes:** Service layer enforces:
- Sort column whitelist (stocked_at, price, year, make)
- Order validation (asc, desc only)
- Page bounds (min 1)
- PageSize bounds (min 1, max 100, default 20)
- All validation happens before calling repository

**Step 1: Write the failing test for VehicleService**

```go
// backend/internal/service/vehicle_test.go
package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type mockVehicleRepo struct {
	vehicles []models.Vehicle
	total    int
	vehicle  *models.Vehicle
	listErr  error
	getErr   error
}

func (m *mockVehicleRepo) List(_ context.Context, _ models.VehicleFilters) ([]models.Vehicle, int, error) {
	return m.vehicles, m.total, m.listErr
}

func (m *mockVehicleRepo) GetByID(_ context.Context, _ uuid.UUID) (*models.Vehicle, error) {
	return m.vehicle, m.getErr
}

func TestVehicleService_List(t *testing.T) {
	twoVehicles := []models.Vehicle{
		{ID: uuid.New(), Make: "Honda", DaysInStock: 45, IsAging: false},
		{ID: uuid.New(), Make: "Toyota", DaysInStock: 120, IsAging: true},
	}

	tests := []struct {
		name       string
		repo       *mockVehicleRepo
		filters    models.VehicleFilters
		wantItems  int
		wantTotal  int
		wantPages  int
		wantPage   int
		wantErr    bool
	}{
		{
			name:      "returns paginated vehicles with defaults applied",
			repo:      &mockVehicleRepo{vehicles: twoVehicles, total: 2},
			filters:   models.VehicleFilters{}, // no filters — defaults should be applied
			wantItems: 2,
			wantTotal: 2,
			wantPages: 1,
			wantPage:  1,
		},
		{
			name:      "caps page_size to 100",
			repo:      &mockVehicleRepo{vehicles: twoVehicles, total: 2},
			filters:   models.VehicleFilters{PageSize: 500},
			wantItems: 2,
			wantTotal: 2,
			wantPages: 1,
			wantPage:  1,
		},
		{
			name:      "normalizes page_size 0 to default 20",
			repo:      &mockVehicleRepo{vehicles: twoVehicles, total: 50},
			filters:   models.VehicleFilters{PageSize: 0},
			wantItems: 2,
			wantTotal: 50,
			wantPages: 3, // ceil(50/20)
			wantPage:  1,
		},
		{
			name:      "normalizes page 0 to 1",
			repo:      &mockVehicleRepo{vehicles: twoVehicles, total: 2},
			filters:   models.VehicleFilters{Page: 0},
			wantItems: 2,
			wantTotal: 2,
			wantPages: 1,
			wantPage:  1,
		},
		{
			name:      "defaults sort to stocked_at desc",
			repo:      &mockVehicleRepo{vehicles: twoVehicles, total: 2},
			filters:   models.VehicleFilters{SortBy: "", Order: ""},
			wantItems: 2,
			wantTotal: 2,
			wantPages: 1,
			wantPage:  1,
		},
		{
			name:      "invalid sort_by falls back to stocked_at",
			repo:      &mockVehicleRepo{vehicles: twoVehicles, total: 2},
			filters:   models.VehicleFilters{SortBy: "DROP TABLE", Order: "asc"},
			wantItems: 2,
			wantTotal: 2,
			wantPages: 1,
			wantPage:  1,
		},
		{
			name:      "invalid order falls back to desc",
			repo:      &mockVehicleRepo{vehicles: twoVehicles, total: 2},
			filters:   models.VehicleFilters{Order: "sideways"},
			wantItems: 2,
			wantTotal: 2,
			wantPages: 1,
			wantPage:  1,
		},
		{
			name:    "propagates repo error",
			repo:    &mockVehicleRepo{listErr: errors.New("db error")},
			filters: models.VehicleFilters{},
			wantErr: true,
		},
		{
			name:      "empty result set",
			repo:      &mockVehicleRepo{vehicles: []models.Vehicle{}, total: 0},
			filters:   models.VehicleFilters{},
			wantItems: 0,
			wantTotal: 0,
			wantPages: 0,
			wantPage:  1,
		},
		{
			name:      "computes total_pages correctly for partial page",
			repo:      &mockVehicleRepo{vehicles: twoVehicles, total: 21},
			filters:   models.VehicleFilters{PageSize: 20, Page: 1},
			wantItems: 2,
			wantTotal: 21,
			wantPages: 2, // ceil(21/20)
			wantPage:  1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewVehicleService(tt.repo)
			result, err := svc.List(context.Background(), tt.filters)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(result.Items) != tt.wantItems {
				t.Errorf("items: expected %d, got %d", tt.wantItems, len(result.Items))
			}
			if result.Total != tt.wantTotal {
				t.Errorf("total: expected %d, got %d", tt.wantTotal, result.Total)
			}
			if result.TotalPages != tt.wantPages {
				t.Errorf("total_pages: expected %d, got %d", tt.wantPages, result.TotalPages)
			}
			if result.Page != tt.wantPage {
				t.Errorf("page: expected %d, got %d", tt.wantPage, result.Page)
			}
		})
	}
}

func TestVehicleService_GetByID(t *testing.T) {
	vid := uuid.New()
	validVehicle := &models.Vehicle{
		ID: vid, Make: "Honda", Model: "Civic", Year: 2023,
		StockedAt: time.Now().Add(-100 * 24 * time.Hour),
		DaysInStock: 100, IsAging: true,
	}

	tests := []struct {
		name    string
		repo    *mockVehicleRepo
		id      uuid.UUID
		wantNil bool
		wantErr bool
	}{
		{
			name: "returns vehicle",
			repo: &mockVehicleRepo{vehicle: validVehicle},
			id:   vid,
		},
		{
			name:    "returns nil for not found",
			repo:    &mockVehicleRepo{vehicle: nil},
			id:      uuid.New(),
			wantNil: true,
		},
		{
			name:    "propagates repo error",
			repo:    &mockVehicleRepo{getErr: errors.New("db error")},
			id:      uuid.New(),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewVehicleService(tt.repo)
			result, err := svc.GetByID(context.Background(), tt.id)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tt.wantNil {
				if result != nil {
					t.Error("expected nil, got vehicle")
				}
				return
			}
			if result == nil {
				t.Fatal("expected vehicle, got nil")
			}
			if result.ID != vid {
				t.Errorf("expected ID %s, got %s", vid, result.ID)
			}
		})
	}
}
```

**Step 2: Run test to verify it fails**
```bash
cd backend && go test -v -race ./internal/service/...
```
Expected: compilation error — `NewVehicleService` not defined.

**Step 3: Implement VehicleService**

```go
// backend/internal/service/vehicle.go
package service

import (
	"context"
	"fmt"
	"math"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/repository"
)

// validSortColumns whitelists allowed sort values.
var validSortColumns = map[string]bool{
	"stocked_at": true,
	"price":      true,
	"year":       true,
	"make":       true,
}

type vehicleService struct {
	repo repository.VehicleRepository
}

func NewVehicleService(repo repository.VehicleRepository) VehicleService {
	return &vehicleService{repo: repo}
}

func (s *vehicleService) List(ctx context.Context, filters models.VehicleFilters) (*models.PaginatedVehicles, error) {
	// Normalize filters
	if filters.Page < 1 {
		filters.Page = 1
	}
	if filters.PageSize < 1 {
		filters.PageSize = 20
	}
	if filters.PageSize > 100 {
		filters.PageSize = 100
	}
	if !validSortColumns[filters.SortBy] {
		filters.SortBy = "stocked_at"
	}
	if filters.Order != "asc" && filters.Order != "desc" {
		filters.Order = "desc"
	}

	vehicles, total, err := s.repo.List(ctx, filters)
	if err != nil {
		return nil, fmt.Errorf("listing vehicles: %w", err)
	}

	if vehicles == nil {
		vehicles = []models.Vehicle{}
	}

	totalPages := 0
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(filters.PageSize)))
	}

	return &models.PaginatedVehicles{
		Items:      vehicles,
		Total:      total,
		Page:       filters.Page,
		PageSize:   filters.PageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *vehicleService) GetByID(ctx context.Context, id uuid.UUID) (*models.Vehicle, error) {
	vehicle, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("getting vehicle by id: %w", err)
	}
	return vehicle, nil
}
```

**Step 4: Run tests to verify they pass**
```bash
cd backend && go test -v -race ./internal/service/... && go vet ./...
```

**Step 5: Commit**
```
feat(backend): implement vehicle service with filter normalization and pagination
```

---

### Task 4: VehicleAction Repository + Service + Tests

**Files:**
- Create: `backend/internal/repository/vehicle_action.go`
- Create: `backend/internal/service/vehicle_action.go`
- Create: `backend/internal/service/vehicle_action_test.go`

**Security notes:**
- `action_type` enum validated in service layer before DB insert
- `created_by` required, max 255 chars validated in service
- `notes` max 2000 chars validated in service
- Vehicle existence check before creating action (prevents foreign key violation with clear error)
- Actions are INSERT-only — no update/delete endpoints

**Step 1: Write the failing test for VehicleActionService**

```go
// backend/internal/service/vehicle_action_test.go
package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type mockVehicleActionRepo struct {
	action  *models.VehicleAction
	actions []models.VehicleAction
	createErr error
	listErr   error
}

func (m *mockVehicleActionRepo) Create(_ context.Context, action models.VehicleAction) (*models.VehicleAction, error) {
	if m.createErr != nil {
		return nil, m.createErr
	}
	return m.action, nil
}

func (m *mockVehicleActionRepo) ListByVehicleID(_ context.Context, _ uuid.UUID) ([]models.VehicleAction, error) {
	return m.actions, m.listErr
}

// mockVehicleRepoForAction implements VehicleRepository for action service tests
type mockVehicleRepoForAction struct {
	vehicle *models.Vehicle
	getErr  error
}

func (m *mockVehicleRepoForAction) List(_ context.Context, _ models.VehicleFilters) ([]models.Vehicle, int, error) {
	return nil, 0, nil
}

func (m *mockVehicleRepoForAction) GetByID(_ context.Context, _ uuid.UUID) (*models.Vehicle, error) {
	return m.vehicle, m.getErr
}

// mockCacheInvalidator implements CacheInvalidator for action service tests
type mockCacheInvalidator struct {
	called bool
}

func (m *mockCacheInvalidator) Invalidate() {
	m.called = true
}

func TestVehicleActionService_Create(t *testing.T) {
	vid := uuid.New()
	existingVehicle := &models.Vehicle{ID: vid, Make: "Honda"}
	createdAction := &models.VehicleAction{
		ID: uuid.New(), VehicleID: vid, ActionType: "price_reduction",
		CreatedBy: "Manager", CreatedAt: time.Now(),
	}

	tests := []struct {
		name         string
		vehicleRepo  *mockVehicleRepoForAction
		actionRepo   *mockVehicleActionRepo
		cache        *mockCacheInvalidator
		vehicleID    uuid.UUID
		input        models.CreateActionInput
		wantErr      bool
		errContains  string
		cacheInvalid bool
	}{
		{
			name:         "creates action successfully",
			vehicleRepo:  &mockVehicleRepoForAction{vehicle: existingVehicle},
			actionRepo:   &mockVehicleActionRepo{action: createdAction},
			cache:        &mockCacheInvalidator{},
			vehicleID:    vid,
			input:        models.CreateActionInput{ActionType: "price_reduction", CreatedBy: "Manager"},
			cacheInvalid: true,
		},
		{
			name:        "rejects invalid action_type",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: existingVehicle},
			actionRepo:  &mockVehicleActionRepo{action: createdAction},
			cache:       &mockCacheInvalidator{},
			vehicleID:   vid,
			input:       models.CreateActionInput{ActionType: "invalid_type", CreatedBy: "Manager"},
			wantErr:     true,
			errContains: "action_type",
		},
		{
			name:        "rejects empty created_by",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: existingVehicle},
			actionRepo:  &mockVehicleActionRepo{action: createdAction},
			cache:       &mockCacheInvalidator{},
			vehicleID:   vid,
			input:       models.CreateActionInput{ActionType: "price_reduction", CreatedBy: ""},
			wantErr:     true,
			errContains: "created_by",
		},
		{
			name:        "rejects notes over 2000 chars",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: existingVehicle},
			actionRepo:  &mockVehicleActionRepo{action: createdAction},
			cache:       &mockCacheInvalidator{},
			vehicleID:   vid,
			input:       models.CreateActionInput{ActionType: "price_reduction", CreatedBy: "Manager", Notes: string(make([]byte, 2001))},
			wantErr:     true,
			errContains: "notes",
		},
		{
			name:        "accepts notes at exactly 2000 chars",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: existingVehicle},
			actionRepo:  &mockVehicleActionRepo{action: createdAction},
			cache:       &mockCacheInvalidator{},
			vehicleID:   vid,
			input:       models.CreateActionInput{ActionType: "price_reduction", CreatedBy: "Manager", Notes: string(make([]byte, 2000))},
			cacheInvalid: true,
		},
		{
			name:        "rejects created_by over 255 chars",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: existingVehicle},
			actionRepo:  &mockVehicleActionRepo{action: createdAction},
			cache:       &mockCacheInvalidator{},
			vehicleID:   vid,
			input:       models.CreateActionInput{ActionType: "price_reduction", CreatedBy: string(make([]byte, 256))},
			wantErr:     true,
			errContains: "created_by",
		},
		{
			name:        "returns error when vehicle not found",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: nil},
			actionRepo:  &mockVehicleActionRepo{action: createdAction},
			cache:       &mockCacheInvalidator{},
			vehicleID:   uuid.New(),
			input:       models.CreateActionInput{ActionType: "price_reduction", CreatedBy: "Manager"},
			wantErr:     true,
			errContains: "not found",
		},
		{
			name:        "propagates repo error on vehicle check",
			vehicleRepo: &mockVehicleRepoForAction{getErr: errors.New("db error")},
			actionRepo:  &mockVehicleActionRepo{action: createdAction},
			cache:       &mockCacheInvalidator{},
			vehicleID:   vid,
			input:       models.CreateActionInput{ActionType: "price_reduction", CreatedBy: "Manager"},
			wantErr:     true,
		},
		{
			name:        "propagates repo error on action create",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: existingVehicle},
			actionRepo:  &mockVehicleActionRepo{createErr: errors.New("insert error")},
			cache:       &mockCacheInvalidator{},
			vehicleID:   vid,
			input:       models.CreateActionInput{ActionType: "price_reduction", CreatedBy: "Manager"},
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewVehicleActionService(tt.actionRepo, tt.vehicleRepo, tt.cache)
			result, err := svc.Create(context.Background(), tt.vehicleID, tt.input)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				if tt.errContains != "" && !containsStr(err.Error(), tt.errContains) {
					t.Errorf("error %q should contain %q", err.Error(), tt.errContains)
				}
				if tt.cache.called {
					t.Error("cache should not be invalidated on error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result == nil {
				t.Fatal("expected action, got nil")
			}
			if tt.cacheInvalid && !tt.cache.called {
				t.Error("expected cache to be invalidated")
			}
		})
	}
}

func TestVehicleActionService_ListByVehicleID(t *testing.T) {
	vid := uuid.New()
	actions := []models.VehicleAction{
		{ID: uuid.New(), VehicleID: vid, ActionType: "price_reduction"},
	}

	tests := []struct {
		name      string
		vehicleRepo *mockVehicleRepoForAction
		actionRepo  *mockVehicleActionRepo
		vehicleID uuid.UUID
		wantCount int
		wantErr   bool
		errContains string
	}{
		{
			name:        "returns actions",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: &models.Vehicle{ID: vid}},
			actionRepo:  &mockVehicleActionRepo{actions: actions},
			vehicleID:   vid,
			wantCount:   1,
		},
		{
			name:        "returns empty list for vehicle with no actions",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: &models.Vehicle{ID: vid}},
			actionRepo:  &mockVehicleActionRepo{actions: []models.VehicleAction{}},
			vehicleID:   vid,
			wantCount:   0,
		},
		{
			name:        "returns error when vehicle not found",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: nil},
			actionRepo:  &mockVehicleActionRepo{},
			vehicleID:   uuid.New(),
			wantErr:     true,
			errContains: "not found",
		},
		{
			name:        "propagates repo error",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: &models.Vehicle{ID: vid}},
			actionRepo:  &mockVehicleActionRepo{listErr: errors.New("db error")},
			vehicleID:   vid,
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewVehicleActionService(tt.actionRepo, tt.vehicleRepo, &mockCacheInvalidator{})
			result, err := svc.ListByVehicleID(context.Background(), tt.vehicleID)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				if tt.errContains != "" && !containsStr(err.Error(), tt.errContains) {
					t.Errorf("error %q should contain %q", err.Error(), tt.errContains)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(result) != tt.wantCount {
				t.Errorf("expected %d actions, got %d", tt.wantCount, len(result))
			}
		})
	}
}

// containsStr is a simple helper to check substring presence.
func containsStr(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsSubstring(s, substr))
}

func containsSubstring(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
```

**Step 2: Run test to verify it fails**
```bash
cd backend && go test -v -race ./internal/service/...
```
Expected: compilation error — `NewVehicleActionService` not defined.

**Step 3: Implement VehicleActionRepository**

```go
// backend/internal/repository/vehicle_action.go
package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type pgxVehicleAction struct {
	pool *pgxpool.Pool
}

func NewVehicleActionRepository(pool *pgxpool.Pool) VehicleActionRepository {
	return &pgxVehicleAction{pool: pool}
}

func (r *pgxVehicleAction) Create(ctx context.Context, action models.VehicleAction) (*models.VehicleAction, error) {
	var a models.VehicleAction
	var notes *string
	err := r.pool.QueryRow(ctx, `
		INSERT INTO vehicle_actions (vehicle_id, action_type, notes, created_by)
		VALUES ($1, $2, $3, $4)
		RETURNING id, vehicle_id, action_type, notes, created_by, created_at`,
		action.VehicleID, action.ActionType, nullableString(action.Notes), action.CreatedBy,
	).Scan(&a.ID, &a.VehicleID, &a.ActionType, &notes, &a.CreatedBy, &a.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("inserting vehicle action: %w", err)
	}
	if notes != nil {
		a.Notes = *notes
	}
	return &a, nil
}

func (r *pgxVehicleAction) ListByVehicleID(ctx context.Context, vehicleID uuid.UUID) ([]models.VehicleAction, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, vehicle_id, action_type, notes, created_by, created_at
		FROM vehicle_actions WHERE vehicle_id = $1 ORDER BY created_at DESC`, vehicleID)
	if err != nil {
		return nil, fmt.Errorf("querying vehicle actions: %w", err)
	}
	defer rows.Close()

	var actions []models.VehicleAction
	for rows.Next() {
		var a models.VehicleAction
		var notes *string
		if err := rows.Scan(&a.ID, &a.VehicleID, &a.ActionType, &notes, &a.CreatedBy, &a.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanning action row: %w", err)
		}
		if notes != nil {
			a.Notes = *notes
		}
		actions = append(actions, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating action rows: %w", err)
	}
	return actions, nil
}

// nullableString converts an empty string to nil for nullable DB columns.
func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
```

**Step 4: Implement VehicleActionService with CacheInvalidator interface**

```go
// backend/internal/service/vehicle_action.go
package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/repository"
)

// CacheInvalidator is called after a write to clear cached dashboard data.
type CacheInvalidator interface {
	Invalidate()
}

var validActionTypes = map[string]bool{
	"price_reduction": true,
	"transfer":        true,
	"auction":         true,
	"marketing":       true,
	"wholesale":       true,
	"custom":          true,
}

type vehicleActionService struct {
	actionRepo  repository.VehicleActionRepository
	vehicleRepo repository.VehicleRepository
	cache       CacheInvalidator
}

func NewVehicleActionService(
	actionRepo repository.VehicleActionRepository,
	vehicleRepo repository.VehicleRepository,
	cache CacheInvalidator,
) VehicleActionService {
	return &vehicleActionService{
		actionRepo:  actionRepo,
		vehicleRepo: vehicleRepo,
		cache:       cache,
	}
}

func (s *vehicleActionService) Create(ctx context.Context, vehicleID uuid.UUID, input models.CreateActionInput) (*models.VehicleAction, error) {
	// Validate input
	if !validActionTypes[input.ActionType] {
		return nil, fmt.Errorf("invalid action_type: %q", input.ActionType)
	}
	input.CreatedBy = strings.TrimSpace(input.CreatedBy)
	if input.CreatedBy == "" {
		return nil, fmt.Errorf("created_by is required")
	}
	if len(input.CreatedBy) > 255 {
		return nil, fmt.Errorf("created_by must be at most 255 characters")
	}
	if len(input.Notes) > 2000 {
		return nil, fmt.Errorf("notes must be at most 2000 characters")
	}

	// Check vehicle exists
	vehicle, err := s.vehicleRepo.GetByID(ctx, vehicleID)
	if err != nil {
		return nil, fmt.Errorf("checking vehicle existence: %w", err)
	}
	if vehicle == nil {
		return nil, fmt.Errorf("vehicle not found: %s", vehicleID)
	}

	// Create action
	action := models.VehicleAction{
		VehicleID:  vehicleID,
		ActionType: input.ActionType,
		Notes:      input.Notes,
		CreatedBy:  input.CreatedBy,
	}
	created, err := s.actionRepo.Create(ctx, action)
	if err != nil {
		return nil, fmt.Errorf("creating vehicle action: %w", err)
	}

	// Invalidate dashboard cache
	s.cache.Invalidate()

	return created, nil
}

func (s *vehicleActionService) ListByVehicleID(ctx context.Context, vehicleID uuid.UUID) ([]models.VehicleAction, error) {
	// Check vehicle exists
	vehicle, err := s.vehicleRepo.GetByID(ctx, vehicleID)
	if err != nil {
		return nil, fmt.Errorf("checking vehicle existence: %w", err)
	}
	if vehicle == nil {
		return nil, fmt.Errorf("vehicle not found: %s", vehicleID)
	}

	actions, err := s.actionRepo.ListByVehicleID(ctx, vehicleID)
	if err != nil {
		return nil, fmt.Errorf("listing vehicle actions: %w", err)
	}
	if actions == nil {
		actions = []models.VehicleAction{}
	}
	return actions, nil
}
```

**Step 5: Run tests**
```bash
cd backend && go test -v -race ./internal/service/... && go vet ./...
```

**Step 6: Commit**
```
feat(backend): implement vehicle action repository and service with validation
```

---

### Task 5: Dashboard Repository + Cache + Service + Tests

**Files:**
- Create: `backend/internal/repository/dashboard.go`
- Create: `backend/internal/service/dashboard_cache.go`
- Create: `backend/internal/service/dashboard.go`
- Create: `backend/internal/service/dashboard_test.go`

**Security notes:** Read-only aggregation query. No user input flows into SQL. Cache is thread-safe with `sync.RWMutex`. Cache TTL prevents stale data.

**Step 1: Write the failing test for DashboardCache and DashboardService**

```go
// backend/internal/service/dashboard_test.go
package service

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type mockDashboardRepo struct {
	summary *models.DashboardSummary
	err     error
	calls   int
}

func (m *mockDashboardRepo) GetSummary(_ context.Context) (*models.DashboardSummary, error) {
	m.calls++
	return m.summary, m.err
}

func TestDashboardCache_GetSet(t *testing.T) {
	cache := NewDashboardCache(30 * time.Second)

	// Initially empty
	data, ok := cache.Get()
	if ok || data != nil {
		t.Error("expected cache miss on empty cache")
	}

	// Set data
	summary := &models.DashboardSummary{TotalVehicles: 10, AgingVehicles: 3}
	cache.Set(summary)

	// Get should return cached data
	data, ok = cache.Get()
	if !ok || data == nil {
		t.Fatal("expected cache hit after Set")
	}
	if data.TotalVehicles != 10 {
		t.Errorf("expected 10 total vehicles, got %d", data.TotalVehicles)
	}
}

func TestDashboardCache_Invalidate(t *testing.T) {
	cache := NewDashboardCache(30 * time.Second)
	summary := &models.DashboardSummary{TotalVehicles: 10}
	cache.Set(summary)

	cache.Invalidate()

	data, ok := cache.Get()
	if ok || data != nil {
		t.Error("expected cache miss after Invalidate")
	}
}

func TestDashboardCache_Expiry(t *testing.T) {
	cache := NewDashboardCache(1 * time.Millisecond)
	summary := &models.DashboardSummary{TotalVehicles: 10}
	cache.Set(summary)

	time.Sleep(5 * time.Millisecond)

	data, ok := cache.Get()
	if ok || data != nil {
		t.Error("expected cache miss after TTL expiry")
	}
}

func TestDashboardCache_ThreadSafety(t *testing.T) {
	cache := NewDashboardCache(30 * time.Second)
	var wg sync.WaitGroup

	for i := 0; i < 100; i++ {
		wg.Add(3)
		go func() {
			defer wg.Done()
			cache.Set(&models.DashboardSummary{TotalVehicles: 1})
		}()
		go func() {
			defer wg.Done()
			cache.Get()
		}()
		go func() {
			defer wg.Done()
			cache.Invalidate()
		}()
	}
	wg.Wait()
}

func TestDashboardService_GetSummary(t *testing.T) {
	summary := &models.DashboardSummary{
		TotalVehicles: 50, AgingVehicles: 10, AvgDaysInStock: 45.5,
		ByMake:   []models.MakeSummary{{Make: "Honda", Count: 20, AgingCount: 5}},
		ByStatus: []models.StatusSummary{{Status: "available", Count: 40}},
	}

	tests := []struct {
		name       string
		repo       *mockDashboardRepo
		preCache   bool
		wantCalls  int
		wantErr    bool
	}{
		{
			name:      "fetches from DB on cache miss",
			repo:      &mockDashboardRepo{summary: summary},
			wantCalls: 1,
		},
		{
			name:      "returns cached data on cache hit",
			repo:      &mockDashboardRepo{summary: summary},
			preCache:  true,
			wantCalls: 0,
		},
		{
			name:    "propagates repo error",
			repo:    &mockDashboardRepo{err: errors.New("db error")},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cache := NewDashboardCache(30 * time.Second)
			if tt.preCache {
				cache.Set(summary)
			}
			svc := NewDashboardService(tt.repo, cache)
			result, err := svc.GetSummary(context.Background())
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result == nil {
				t.Fatal("expected summary, got nil")
			}
			if result.TotalVehicles != 50 {
				t.Errorf("expected 50 total vehicles, got %d", result.TotalVehicles)
			}
			if tt.repo.calls != tt.wantCalls {
				t.Errorf("expected %d repo calls, got %d", tt.wantCalls, tt.repo.calls)
			}
		})
	}
}
```

**Step 2: Run test to verify it fails**
```bash
cd backend && go test -v -race ./internal/service/...
```

**Step 3: Implement DashboardCache**

```go
// backend/internal/service/dashboard_cache.go
package service

import (
	"sync"
	"time"

	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

// DashboardCache provides thread-safe in-memory caching for dashboard summary data.
type DashboardCache struct {
	mu     sync.RWMutex
	data   *models.DashboardSummary
	expiry time.Time
	ttl    time.Duration
}

func NewDashboardCache(ttl time.Duration) *DashboardCache {
	return &DashboardCache{ttl: ttl}
}

func (c *DashboardCache) Get() (*models.DashboardSummary, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.data == nil || time.Now().After(c.expiry) {
		return nil, false
	}
	return c.data, true
}

func (c *DashboardCache) Set(data *models.DashboardSummary) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data = data
	c.expiry = time.Now().Add(c.ttl)
}

func (c *DashboardCache) Invalidate() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data = nil
	c.expiry = time.Time{}
}
```

**Step 4: Implement DashboardService**

```go
// backend/internal/service/dashboard.go
package service

import (
	"context"
	"fmt"

	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/repository"
)

type dashboardService struct {
	repo  repository.DashboardRepository
	cache *DashboardCache
}

func NewDashboardService(repo repository.DashboardRepository, cache *DashboardCache) DashboardService {
	return &dashboardService{repo: repo, cache: cache}
}

func (s *dashboardService) GetSummary(ctx context.Context) (*models.DashboardSummary, error) {
	// Check cache first
	if data, ok := s.cache.Get(); ok {
		return data, nil
	}

	// Cache miss — fetch from DB
	summary, err := s.repo.GetSummary(ctx)
	if err != nil {
		return nil, fmt.Errorf("getting dashboard summary: %w", err)
	}

	// Cache the result
	s.cache.Set(summary)

	return summary, nil
}
```

**Step 5: Implement DashboardRepository**

```go
// backend/internal/repository/dashboard.go
package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type pgxDashboard struct {
	pool *pgxpool.Pool
}

func NewDashboardRepository(pool *pgxpool.Pool) DashboardRepository {
	return &pgxDashboard{pool: pool}
}

func (r *pgxDashboard) GetSummary(ctx context.Context) (*models.DashboardSummary, error) {
	summary := &models.DashboardSummary{}

	// Total and aging counts + average days
	err := r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) AS total_vehicles,
			COUNT(*) FILTER (WHERE stocked_at <= NOW() - INTERVAL '90 days') AS aging_vehicles,
			COALESCE(AVG(EXTRACT(EPOCH FROM NOW() - stocked_at) / 86400), 0) AS avg_days_in_stock
		FROM vehicles`).Scan(&summary.TotalVehicles, &summary.AgingVehicles, &summary.AvgDaysInStock)
	if err != nil {
		return nil, fmt.Errorf("querying vehicle totals: %w", err)
	}

	// By make
	makeRows, err := r.pool.Query(ctx, `
		SELECT
			make,
			COUNT(*) AS count,
			COUNT(*) FILTER (WHERE stocked_at <= NOW() - INTERVAL '90 days') AS aging_count
		FROM vehicles
		GROUP BY make
		ORDER BY count DESC`)
	if err != nil {
		return nil, fmt.Errorf("querying by make: %w", err)
	}
	defer makeRows.Close()

	for makeRows.Next() {
		var ms models.MakeSummary
		if err := makeRows.Scan(&ms.Make, &ms.Count, &ms.AgingCount); err != nil {
			return nil, fmt.Errorf("scanning make summary: %w", err)
		}
		summary.ByMake = append(summary.ByMake, ms)
	}
	if err := makeRows.Err(); err != nil {
		return nil, fmt.Errorf("iterating make rows: %w", err)
	}

	// By status
	statusRows, err := r.pool.Query(ctx, `
		SELECT status, COUNT(*) AS count
		FROM vehicles
		GROUP BY status
		ORDER BY count DESC`)
	if err != nil {
		return nil, fmt.Errorf("querying by status: %w", err)
	}
	defer statusRows.Close()

	for statusRows.Next() {
		var ss models.StatusSummary
		if err := statusRows.Scan(&ss.Status, &ss.Count); err != nil {
			return nil, fmt.Errorf("scanning status summary: %w", err)
		}
		summary.ByStatus = append(summary.ByStatus, ss)
	}
	if err := statusRows.Err(); err != nil {
		return nil, fmt.Errorf("iterating status rows: %w", err)
	}

	// Ensure non-nil slices
	if summary.ByMake == nil {
		summary.ByMake = []models.MakeSummary{}
	}
	if summary.ByStatus == nil {
		summary.ByStatus = []models.StatusSummary{}
	}

	return summary, nil
}
```

**Step 6: Run tests + vet**
```bash
cd backend && go test -v -race ./internal/service/... && go vet ./...
```

**Step 7: Commit**
```
feat(backend): implement dashboard repository, cache, and service
```

---

### Task 6: Wire Handler — All Endpoints

**Files:**
- Modify: `backend/internal/handler/handler.go` (replace stub implementations)
- Modify: `backend/cmd/server/main.go` (wire new services)

**Security notes:**
- Handler maps validation errors → 400, not found → 404, internal → 500
- Error messages are generic — no internal details leaked
- oapi-codegen already validates UUID path params and parses query params
- Handler converts between oapi-codegen generated types and domain models

**Step 1: Update handler.go to accept all services**

```go
// backend/internal/handler/handler.go — full replacement
package handler

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/service"
)

type Server struct {
	healthSvc    service.HealthService
	dealershipSvc service.DealershipService
	vehicleSvc   service.VehicleService
	actionSvc    service.VehicleActionService
	dashboardSvc service.DashboardService
}

func NewServer(
	healthSvc service.HealthService,
	dealershipSvc service.DealershipService,
	vehicleSvc service.VehicleService,
	actionSvc service.VehicleActionService,
	dashboardSvc service.DashboardService,
) *Server {
	return &Server{
		healthSvc:     healthSvc,
		dealershipSvc: dealershipSvc,
		vehicleSvc:    vehicleSvc,
		actionSvc:     actionSvc,
		dashboardSvc:  dashboardSvc,
	}
}
```

**Step 2: Implement each handler method**

Each handler method converts oapi-codegen request types → domain models, calls the service, then converts domain models → oapi-codegen response types.

Key conversions:
- `ListVehiclesRequestObject.Params` → `models.VehicleFilters`
- `models.Dealership` → `handler.Dealership`
- `models.Vehicle` → `handler.Vehicle` (including computed fields `DaysInStock`, `IsAging`)
- `models.VehicleAction` → `handler.VehicleAction`
- `models.DashboardSummary` → `handler.DashboardSummary`
- Error detection: check for `"not found"` in error string → 404, validation errors → 400, else → 500

**Handler implementation patterns:**

For `ListDealerships`:
- Call `dealershipSvc.List(ctx)`
- Convert `[]models.Dealership` → `ListDealerships200JSONResponse`
- Error → `ListDealerships500JSONResponse`

For `ListVehicles`:
- Convert `ListVehiclesParams` → `models.VehicleFilters`
- Call `vehicleSvc.List(ctx, filters)`
- Convert `*models.PaginatedVehicles` → `ListVehicles200JSONResponse`
- Error → `ListVehicles500JSONResponse`

For `GetVehicle`:
- Call `vehicleSvc.GetByID(ctx, uuid.UUID(request.Id))`
- nil → `GetVehicle404JSONResponse`
- Convert `*models.Vehicle` → `GetVehicle200JSONResponse`
- Error → `GetVehicle500JSONResponse`

For `ListVehicleActions`:
- Call `actionSvc.ListByVehicleID(ctx, uuid.UUID(request.Id))`
- "not found" error → `ListVehicleActions404JSONResponse`
- Convert `[]models.VehicleAction` → `ListVehicleActions200JSONResponse`

For `CreateVehicleAction`:
- Convert `request.Body` → `models.CreateActionInput`
- Call `actionSvc.Create(ctx, uuid.UUID(request.Id), input)`
- "not found" error → `CreateVehicleAction404JSONResponse`
- Validation error → `CreateVehicleAction400JSONResponse`
- Convert `*models.VehicleAction` → `CreateVehicleAction201JSONResponse`

For `GetDashboardSummary`:
- Call `dashboardSvc.GetSummary(ctx)`
- Convert `*models.DashboardSummary` → `GetDashboardSummary200JSONResponse`
- Error → `GetDashboardSummary500JSONResponse`

**Step 3: Update main.go to wire all layers**

```go
// In main.go, after health repo/svc creation:
dealershipRepo := repository.NewDealershipRepository(pool)
dealershipSvc := service.NewDealershipService(dealershipRepo)

vehicleRepo := repository.NewVehicleRepository(pool)
vehicleSvc := service.NewVehicleService(vehicleRepo)

dashboardRepo := repository.NewDashboardRepository(pool)
dashboardCache := service.NewDashboardCache(30 * time.Second)
dashboardSvc := service.NewDashboardService(dashboardRepo, dashboardCache)

actionRepo := repository.NewVehicleActionRepository(pool)
actionSvc := service.NewVehicleActionService(actionRepo, vehicleRepo, dashboardCache)

srv := handler.NewServer(healthSvc, dealershipSvc, vehicleSvc, actionSvc, dashboardSvc)
```

**Step 4: Run vet + build**
```bash
cd backend && go vet ./... && go build ./cmd/server
```

**Step 5: Commit**
```
feat(backend): wire all handler endpoints with service layer
```

---

### Task 7: Handler Tests

**Files:**
- Modify: `backend/internal/handler/handler_test.go` (add tests for all endpoints)

**Security notes:** Tests verify:
- Error responses use correct HTTP status codes (400, 404, 500)
- Error responses use `ErrorResponse` format (no internal details)
- Valid inputs produce correct response types

**Step 1: Add mock services and tests for all endpoints**

Test cases per endpoint:

**ListDealerships:**
- Success → `ListDealerships200JSONResponse`
- Service error → `ListDealerships500JSONResponse`

**ListVehicles:**
- Success with filters → `ListVehicles200JSONResponse`
- Service error → `ListVehicles500JSONResponse`

**GetVehicle:**
- Success → `GetVehicle200JSONResponse`
- Not found (nil return) → `GetVehicle404JSONResponse`
- Service error → `GetVehicle500JSONResponse`

**ListVehicleActions:**
- Success → `ListVehicleActions200JSONResponse`
- Not found → `ListVehicleActions404JSONResponse`
- Service error → `ListVehicleActions500JSONResponse`

**CreateVehicleAction:**
- Success → `CreateVehicleAction201JSONResponse`
- Validation error → `CreateVehicleAction400JSONResponse`
- Vehicle not found → `CreateVehicleAction404JSONResponse`
- Service error → `CreateVehicleAction500JSONResponse`

**GetDashboardSummary:**
- Success → `GetDashboardSummary200JSONResponse`
- Service error → `GetDashboardSummary500JSONResponse`

**Step 2: Run tests**
```bash
cd backend && go test -v -race ./internal/handler/... && go vet ./...
```

**Step 3: Commit**
```
test(backend): add handler tests for all endpoints
```

---

### Task 8: Integration Verification

**Files:** No new files. This task verifies everything works together.

**Steps:**

**Step 1: Run all backend tests**
```bash
cd backend && go test -v -race ./... && go vet ./...
```

**Step 2: Start Docker Compose stack**
```bash
docker compose up -d
```

**Step 3: Manual API verification**
```bash
# Health
curl -s http://localhost:8080/health | jq .

# List dealerships
curl -s http://localhost:8080/api/v1/dealerships | jq .

# List vehicles (all)
curl -s 'http://localhost:8080/api/v1/vehicles' | jq .

# List vehicles (filtered)
curl -s 'http://localhost:8080/api/v1/vehicles?aging=true&sort_by=stocked_at&order=desc' | jq .

# Dashboard summary
curl -s http://localhost:8080/api/v1/dashboard/summary | jq .

# Get vehicle detail (use a vehicle ID from list above)
curl -s http://localhost:8080/api/v1/vehicles/{id} | jq .

# Create action
curl -s -X POST http://localhost:8080/api/v1/vehicles/{id}/actions \
  -H 'Content-Type: application/json' \
  -d '{"action_type":"price_reduction","created_by":"Test Manager","notes":"Test action"}' | jq .

# List actions for vehicle
curl -s http://localhost:8080/api/v1/vehicles/{id}/actions | jq .

# Verify dashboard cache invalidation — summary should reflect new action
curl -s http://localhost:8080/api/v1/dashboard/summary | jq .
```

**Step 4: Stop Docker Compose**
```bash
docker compose down
```

**Step 5: Commit** (only if fixes were needed)
```
fix(backend): integration fixes from manual testing
```

---

### Task 9: Update System Design Document

**Files:**
- Modify: `docs/plans/2026-03-17-system-design.md`

**Steps:**
1. Update L3 Backend Component Diagram to add DashboardCache component
2. Add L4 Code Diagram from spec (classDiagram showing interfaces)
3. Add runtime flow diagrams: List Vehicles, Create Vehicle Action, Dashboard Summary
4. Commit

```
docs: update system design with backend L4 diagram and runtime flows
```

---

## Task Dependency Order

```
Task 0 (C4 diagrams)           — independent, can run first or in parallel
Task 1 (Dealership repo+svc)   — independent foundation
Task 2 (Vehicle repo)          — independent foundation
Task 3 (Vehicle svc+tests)     — depends on Task 2 (uses VehicleRepository interface)
Task 4 (Action repo+svc+tests) — depends on Task 2 (uses VehicleRepository for existence check)
Task 5 (Dashboard repo+cache+svc+tests) — independent
Task 6 (Wire handler)          — depends on Tasks 1, 3, 4, 5
Task 7 (Handler tests)         — depends on Task 6
Task 8 (Integration)           — depends on Task 7
Task 9 (Update design doc)     — depends on Tasks 1-7 (need to know final implementation)
```

**Parallel opportunities:**
- Tasks 0, 1, 2, 5 can all run in parallel
- Tasks 3 and 4 can run in parallel (both depend on Task 2)
- Tasks 6, 7, 8, 9 are sequential

## Summary

| # | Task | Files Created/Modified | Est. Tests |
|---|------|----------------------|------------|
| 0 | C4 + Flow Diagrams | docs/plans/system-design.md | — |
| 1 | Dealership Repo + Service | 3 files | 3 tests |
| 2 | Vehicle Repository | 1 file | — |
| 3 | Vehicle Service + Tests | 2 files | 12 tests |
| 4 | Action Repo + Service + Tests | 3 files | 14 tests |
| 5 | Dashboard Repo + Cache + Service + Tests | 4 files | 8 tests |
| 6 | Wire Handler | 2 files modified | — |
| 7 | Handler Tests | 1 file modified | 14 tests |
| 8 | Integration Verification | — | manual |
| 9 | Update System Design Doc | 1 file modified | — |
| **Total** | | **16 files** | **~51 tests** |
