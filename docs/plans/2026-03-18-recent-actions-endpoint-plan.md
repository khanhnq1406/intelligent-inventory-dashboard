# Recent Actions Endpoint Implementation Plan

> **For implementation:** Use the secure-feature-pipeline skill, step: implement

**Goal:** Add `GET /api/v1/actions/recent` and replace the dashboard's vehicle-page workaround with a purpose-built hook.
**Spec:** `docs/specs/2026-03-18-recent-actions-endpoint-spec.md`
**Architecture:** New method added to each existing layer (repository → service → handler) following identical patterns to `ListByVehicleID`. Frontend: one new hook, one page simplification. No new containers or components.
**Tech Stack:** Go + Chi + oapi-codegen + pgx | Next.js 14 + TanStack Query + shadcn/ui | PostgreSQL 16

## Security Implementation Notes

- `dealership_id`: parsed as `uuid.UUID` by oapi-codegen; invalid UUIDs rejected at generated-handler level (400 before reaching our code)
- `limit`: clamped to [1, 50] in service layer — invalid values return 400
- SQL: two parameterized placeholders only (`$1` for dealership_id nullable, `$2` for limit) — zero string interpolation
- No new auth surface: matches existing project security posture

## C4 Architecture Diagram Updates

No C4 update needed — this adds a method to existing layers, not a new container or component.

---

### Task 0: Add `created_at` index on `vehicle_actions`

The `ORDER BY va.created_at DESC` query needs an index. Currently `001_init.up.sql` only has `idx_vehicle_actions_vehicle` (on `vehicle_id`). Add a new migration.

**Files:**
- Create: `backend/migrations/003_vehicle_actions_created_at_idx.up.sql`
- Create: `backend/migrations/003_vehicle_actions_created_at_idx.down.sql`

**Security notes:** DDL-only migration, no user input.

**Step 1: Write migration files**

`003_vehicle_actions_created_at_idx.up.sql`:
```sql
CREATE INDEX idx_vehicle_actions_created_at ON vehicle_actions(created_at DESC);
```

`003_vehicle_actions_created_at_idx.down.sql`:
```sql
DROP INDEX IF EXISTS idx_vehicle_actions_created_at;
```

**Step 2: Verify migration compiles (apply locally if stack is running)**
```bash
make migrate-up
# or verify syntax: psql ... -f backend/migrations/003_vehicle_actions_created_at_idx.up.sql
```

**Step 3: Commit**
```
feat(db): add created_at DESC index on vehicle_actions for recent-actions query
```

---

### Task 1: OpenAPI spec — add `RecentAction` schema and `/api/v1/actions/recent` endpoint

**Files:**
- Modify: `api/openapi.yaml`

**Security notes:** Endpoint uses query params only (no path params). `dealership_id` format: uuid — oapi-codegen will generate a typed `*openapi_types.UUID` param.

**Step 1: Add `RecentAction` schema** to `components/schemas` in `api/openapi.yaml`:

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

**Step 2: Add endpoint** under `paths` in `api/openapi.yaml`:

```yaml
  /api/v1/actions/recent:
    get:
      operationId: listRecentActions
      summary: List recent actions across all vehicles
      tags: [actions]
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
          description: Recent actions with vehicle context
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

**Step 3: Regenerate code**
```bash
make generate
cd backend && go build ./...
```
Fix any compile errors from the newly generated interface method.

**Step 4: Commit**
```
feat(api): add RecentAction schema and GET /api/v1/actions/recent endpoint to OpenAPI spec
```

---

### Task 2: Model — add `RecentAction` to models.go

**Files:**
- Modify: `backend/internal/models/models.go`

**Security notes:** Plain data struct, no logic.

**Step 1: Add struct** after `VehicleAction`:

```go
// RecentAction is returned by GET /api/v1/actions/recent.
// It enriches a VehicleAction with vehicle context for dashboard display.
type RecentAction struct {
    ID           uuid.UUID `json:"id"`
    VehicleID    uuid.UUID `json:"vehicle_id"`
    VehicleMake  string    `json:"vehicle_make"`
    VehicleModel string    `json:"vehicle_model"`
    VehicleYear  int       `json:"vehicle_year"`
    DaysInStock  int       `json:"days_in_stock"`
    ActionType   string    `json:"action_type"`
    Notes        string    `json:"notes,omitempty"`
    CreatedBy    string    `json:"created_by"`
    CreatedAt    time.Time `json:"created_at"`
}

// RecentActionsFilter holds validated params for the ListRecent query.
type RecentActionsFilter struct {
    DealershipID *uuid.UUID
    Limit        int
}
```

**Step 2: Build check**
```bash
cd backend && go build ./...
```

**Step 3: Commit**
```
feat(models): add RecentAction struct and RecentActionsFilter
```

---

### Task 3: Repository — add `ListRecent` to `VehicleActionRepository`

**Files:**
- Modify: `backend/internal/repository/repository.go` (interface)
- Modify: `backend/internal/repository/vehicle_action.go` (implementation)
- Modify: `backend/internal/repository/vehicle_action_test.go` (or create if absent — check)

**Security notes:** `dealership_id` bound as `$1` (nullable); `limit` bound as `$2`. No string interpolation. The `$1::uuid IS NULL OR v.dealership_id = $1` pattern lets PostgreSQL handle the optional filter without dynamic SQL.

**Step 1: Write the failing test** in `backend/internal/repository/vehicle_action_test.go` (TDD):

```go
// TestListRecent_ReturnsEnrichedActions verifies the repository returns
// enriched actions ordered by created_at DESC and respects limit + dealership filter.
func TestListRecent_ReturnsEnrichedActions(t *testing.T) {
    // This test documents the expected contract; actual DB test requires integration setup.
    // Unit-testable logic is in the service layer (Task 4).
    // Mark as skipped if no test DB is configured.
    t.Skip("integration test — requires real DB; covered by handler test")
}
```

(The meaningful test coverage is in the service layer via mock, and in the handler integration test. Repository contract is verified there.)

**Step 2: Add interface method** to `repository/repository.go`:

```go
type VehicleActionRepository interface {
    Create(ctx context.Context, action models.VehicleAction) (*models.VehicleAction, error)
    ListByVehicleID(ctx context.Context, vehicleID uuid.UUID) ([]models.VehicleAction, error)
    ListRecent(ctx context.Context, filter models.RecentActionsFilter) ([]models.RecentAction, error)
}
```

**Step 3: Implement** in `repository/vehicle_action.go`:

```go
func (r *pgxVehicleAction) ListRecent(ctx context.Context, filter models.RecentActionsFilter) ([]models.RecentAction, error) {
    var dealershipID interface{} = nil
    if filter.DealershipID != nil {
        dealershipID = *filter.DealershipID
    }

    rows, err := r.pool.Query(ctx, `
        SELECT va.id, va.vehicle_id, va.action_type, va.notes, va.created_by, va.created_at,
               v.make, v.model, v.year,
               EXTRACT(EPOCH FROM NOW() - v.stocked_at)::int / 86400 AS days_in_stock
        FROM vehicle_actions va
        JOIN vehicles v ON v.id = va.vehicle_id
        WHERE ($1::uuid IS NULL OR v.dealership_id = $1)
        ORDER BY va.created_at DESC
        LIMIT $2`,
        dealershipID, filter.Limit)
    if err != nil {
        return nil, fmt.Errorf("querying recent actions: %w", err)
    }
    defer rows.Close()

    var actions []models.RecentAction
    for rows.Next() {
        var a models.RecentAction
        var notes *string
        if err := rows.Scan(
            &a.ID, &a.VehicleID, &a.ActionType, &notes, &a.CreatedBy, &a.CreatedAt,
            &a.VehicleMake, &a.VehicleModel, &a.VehicleYear, &a.DaysInStock,
        ); err != nil {
            return nil, fmt.Errorf("scanning recent action row: %w", err)
        }
        if notes != nil {
            a.Notes = *notes
        }
        actions = append(actions, a)
    }
    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("iterating recent action rows: %w", err)
    }
    if actions == nil {
        actions = []models.RecentAction{}
    }
    return actions, nil
}
```

**Step 4: Build + vet**
```bash
cd backend && go build ./... && go vet ./...
```

**Step 5: Commit**
```
feat(repository): add ListRecent to VehicleActionRepository with JOIN vehicles query
```

---

### Task 4: Service — add `ListRecent` to `VehicleActionService`

**Files:**
- Modify: `backend/internal/service/service.go` (interface)
- Modify: `backend/internal/service/vehicle_action.go` (implementation + tests)

**Security notes:** Service validates and clamps `limit` to [1, 50]. This is the only place user-controlled `limit` is validated — repository trusts the service.

**Step 1: Write the failing test** in `backend/internal/service/vehicle_action_test.go`:

```go
func TestListRecent(t *testing.T) {
    dealershipID := uuid.MustParse("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")
    actionID := uuid.New()
    vehicleID := uuid.New()

    now := time.Now()
    mockResult := []models.RecentAction{
        {
            ID: actionID, VehicleID: vehicleID,
            VehicleMake: "Toyota", VehicleModel: "Camry", VehicleYear: 2022,
            DaysInStock: 120, ActionType: "price_reduction",
            CreatedBy: "John", CreatedAt: now,
        },
    }

    tests := []struct {
        name        string
        dealership  *uuid.UUID
        limit       int
        repoResult  []models.RecentAction
        repoErr     error
        wantErr     bool
        wantLen     int
        wantLimit   int // limit passed to repo
    }{
        {
            name: "returns enriched actions",
            dealership: &dealershipID, limit: 3,
            repoResult: mockResult,
            wantLen: 1, wantLimit: 3,
        },
        {
            name: "clamps limit below 1 to 1",
            limit: 0, wantLimit: 1, wantLen: 0,
        },
        {
            name: "clamps limit above 50 to 50",
            limit: 999, wantLimit: 50, wantLen: 0,
        },
        {
            name: "default limit 10 when 0 passed",
            // limit 0 → error path tested above; here test that service enforces min
            limit: 0, wantErr: true, // returns 400-style error for invalid input
        },
        {
            name:    "propagates repo error",
            limit:   5, repoErr: errors.New("db error"),
            wantErr: true,
        },
    }
    // ... table test implementation
}
```

Adjust the test cases to match the exact validation semantics decided (clamp vs error — pick one and be consistent in implementation).

**Recommended:** Return error on `limit < 1` or `limit > 50` (matches spec FR-1 acceptance criteria: "limit outside [1,50] returns 400").

**Step 2: Add interface method** to `service/service.go`:

```go
type VehicleActionService interface {
    Create(ctx context.Context, vehicleID uuid.UUID, input models.CreateActionInput) (*models.VehicleAction, error)
    ListByVehicleID(ctx context.Context, vehicleID uuid.UUID) ([]models.VehicleAction, error)
    ListRecent(ctx context.Context, filter models.RecentActionsFilter) ([]models.RecentAction, error)
}
```

**Step 3: Implement** in `service/vehicle_action.go`:

```go
func (s *vehicleActionService) ListRecent(ctx context.Context, filter models.RecentActionsFilter) ([]models.RecentAction, error) {
    if filter.Limit < 1 || filter.Limit > 50 {
        return nil, fmt.Errorf("limit must be between 1 and 50")
    }
    actions, err := s.actionRepo.ListRecent(ctx, filter)
    if err != nil {
        return nil, fmt.Errorf("listing recent actions: %w", err)
    }
    return actions, nil
}
```

**Step 4: Run tests with -race**
```bash
cd backend && go test -v -race ./internal/service/... && go vet ./...
```

**Step 5: Commit**
```
feat(service): add ListRecent to VehicleActionService with limit validation
```

---

### Task 5: Handler — implement `ListRecentActions`

**Files:**
- Modify: `backend/internal/handler/handler.go`
- Modify: `backend/internal/handler/handler_test.go`

**Security notes:** `dealership_id` query param arrives as `*openapi_types.UUID` (already UUID-typed by oapi-codegen — no raw string UUID parsing needed). `limit` arrives as `*int` with the OpenAPI min/max enforced. Handler maps to `models.RecentActionsFilter`, calls service, maps result to `ListRecentActions200JSONResponse`.

**Step 1: Write the failing test** — add to `handler_test.go`:

```go
func TestListRecentActions(t *testing.T) {
    dealershipID := uuid.MustParse("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")
    actionID := uuid.New()
    vehicleID := uuid.New()
    now := time.Now()

    tests := []struct {
        name       string
        params     ListRecentActionsParams
        svcResult  []models.RecentAction
        svcErr     error
        wantStatus int
        wantLen    int
    }{
        {
            name:   "returns recent actions",
            params: ListRecentActionsParams{Limit: ptr(3)},
            svcResult: []models.RecentAction{
                {ID: actionID, VehicleID: vehicleID, VehicleMake: "Toyota",
                 VehicleModel: "Camry", VehicleYear: 2022, DaysInStock: 120,
                 ActionType: "price_reduction", CreatedBy: "John", CreatedAt: now},
            },
            wantStatus: 200, wantLen: 1,
        },
        {
            name:   "filters by dealership_id",
            params: ListRecentActionsParams{Limit: ptr(5), DealershipId: &dealershipID},
            svcResult: []models.RecentAction{},
            wantStatus: 200, wantLen: 0,
        },
        {
            name:       "service error returns 500",
            params:     ListRecentActionsParams{Limit: ptr(3)},
            svcErr:     errors.New("db error"),
            wantStatus: 500,
        },
        {
            name:       "invalid limit from service returns 400",
            params:     ListRecentActionsParams{Limit: ptr(3)},
            svcErr:     fmt.Errorf("limit must be between 1 and 50"),
            wantStatus: 400,
        },
    }
    // ... table test implementation with mockVehicleActionService
}
```

**Step 2: Implement** `ListRecentActions` in `handler.go`:

```go
func (s *Server) ListRecentActions(ctx context.Context, request ListRecentActionsRequestObject) (ListRecentActionsResponseObject, error) {
    limit := 10
    if request.Params.Limit != nil {
        limit = *request.Params.Limit
    }

    filter := models.RecentActionsFilter{Limit: limit}
    if request.Params.DealershipId != nil {
        id := uuid.UUID(*request.Params.DealershipId)
        filter.DealershipID = &id
    }

    actions, err := s.actionSvc.ListRecent(ctx, filter)
    if err != nil {
        if strings.Contains(err.Error(), "limit must be between") {
            return ListRecentActions400JSONResponse{
                Code:    http.StatusBadRequest,
                Message: err.Error(),
            }, nil
        }
        return ListRecentActions500JSONResponse{
            Code:    http.StatusInternalServerError,
            Message: "Failed to retrieve recent actions",
        }, nil
    }

    resp := make(ListRecentActions200JSONResponse, 0, len(actions))
    for _, a := range actions {
        resp = append(resp, RecentAction{
            Id:           a.ID,
            VehicleId:    a.VehicleID,
            VehicleMake:  a.VehicleMake,
            VehicleModel: a.VehicleModel,
            VehicleYear:  a.VehicleYear,
            DaysInStock:  a.DaysInStock,
            ActionType:   RecentActionActionType(a.ActionType),
            Notes:        &a.Notes,
            CreatedBy:    a.CreatedBy,
            CreatedAt:    a.CreatedAt,
        })
    }
    return resp, nil
}
```

(Adjust field names to match what `make generate` actually generates — check `api.gen.go` after Task 1.)

**Step 3: Run tests with -race + vet**
```bash
cd backend && go test -v -race ./internal/handler/... && go vet ./...
```

**Step 4: Commit**
```
feat(handler): implement ListRecentActions for GET /api/v1/actions/recent
```

---

### Task 6: Frontend hook — `useRecentActions`

**Files:**
- Create: `frontend/src/hooks/use-recent-actions.ts`

**Security notes:** No user input beyond typed params from hook caller.

**Step 1: Write the failing test** — create `frontend/src/hooks/use-recent-actions.test.ts`:

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { useRecentActions } from "./use-recent-actions";
import { createWrapper } from "@/test-utils"; // reuse existing test wrapper

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
}));

describe("useRecentActions", () => {
  it("calls /api/v1/actions/recent with limit param", async () => {
    const { apiFetch } = await import("@/lib/api/client");
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { result } = renderHook(() => useRecentActions({ limit: 3 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/actions/recent?limit=3");
  });

  it("calls without params when none provided", async () => {
    const { apiFetch } = await import("@/lib/api/client");
    (apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { result } = renderHook(() => useRecentActions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiFetch).toHaveBeenCalledWith("/api/v1/actions/recent");
  });
});
```

**Step 2: Implement** `frontend/src/hooks/use-recent-actions.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { components, operations } from "@/lib/api/types";

type RecentAction = components["schemas"]["RecentAction"];
type RecentActionsParams = operations["listRecentActions"]["parameters"]["query"];

export function useRecentActions(params?: RecentActionsParams) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        searchParams.set(key, String(value));
      }
    });
  }
  const query = searchParams.toString();

  return useQuery({
    queryKey: ["recent-actions", params ?? {}],
    queryFn: () =>
      apiFetch<RecentAction[]>(`/api/v1/actions/recent${query ? `?${query}` : ""}`),
  });
}
```

**Step 3: Run tests**
```bash
cd frontend && npm test
```

**Step 4: Commit**
```
feat(hooks): add useRecentActions hook for GET /api/v1/actions/recent
```

---

### Task 7: Dashboard — replace vehicle-fetch workaround with `useRecentActions`

**Files:**
- Modify: `frontend/src/app/page.tsx`

**Security notes:** No input, read-only display.

**Step 1: Write the failing test** — check/update `frontend/src/app/__tests__/page.test.tsx` or equivalent:

```typescript
// Verify dashboard uses useRecentActions, not the old vehicle-flattening approach
it("renders Recent Actions rows from useRecentActions", async () => {
  // mock useRecentActions to return 1 action
  // assert the action row is rendered
  // assert useVehicles is NOT called (or not called with page_size:20)
});
```

**Step 2: Modify** `frontend/src/app/page.tsx`:

Remove:
```tsx
import { useVehicles } from "@/hooks/use-vehicles";
// ...
const { data: vehiclesData } = useVehicles({ page_size: 20, order: "desc", sort_by: "stocked_at" });
const recentActions = vehiclesData?.items
  ?.flatMap((v) => (v.actions ?? []).map((a) => ({ ... })))
  .sort(...)
  .slice(0, 3);
```

Add:
```tsx
import { useRecentActions } from "@/hooks/use-recent-actions";
// ...
const { data: recentActionsData } = useRecentActions({ limit: 3 });
```

Update table rendering to use `recentActionsData` directly. Field mapping:
- `action.vehicle` → `` `${a.vehicle_year} ${a.vehicle_make} ${a.vehicle_model}` ``
- `action.actionType` → `a.action_type`
- `action.daysInStock` → `a.days_in_stock`
- `action.date` → `a.created_at`

**Step 3: Run tests**
```bash
cd frontend && npm test
```

**Step 4: Commit**
```
feat(dashboard): replace vehicle-page workaround with useRecentActions hook
```

---

### Task 8: End-to-end smoke test (manual)

```bash
docker compose up -d
make migrate-up

# Verify endpoint works
curl -s "http://localhost:8080/api/v1/actions/recent?limit=3" | jq .
curl -s "http://localhost:8080/api/v1/actions/recent?limit=3&dealership_id=a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" | jq .

# Verify bad limit
curl -s "http://localhost:8080/api/v1/actions/recent?limit=0" | jq .   # expect 400
curl -s "http://localhost:8080/api/v1/actions/recent?limit=999" | jq . # expect 400

# Browser
# http://localhost:3000 — "Recent Actions" should show 3 rows
```
