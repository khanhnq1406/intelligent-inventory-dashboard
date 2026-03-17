# Intelligent Inventory Dashboard — System Design Document

## 1. Architecture Overview

### 1.1 Architecture Diagram (C4 — Container Level)

```mermaid
C4Container
  title Intelligent Inventory Dashboard — Container Diagram

  Person(manager, "Dealership Manager", "Views inventory, identifies aging stock, logs actions")

  System_Boundary(sys, "Intelligent Inventory Dashboard") {
    Container(frontend, "Frontend", "Next.js 14, TanStack Query, shadcn/ui", "Filterable dashboard UI for inventory management")
    Container(backend, "Backend API", "Go, Chi, oapi-codegen", "RESTful API with business logic for inventory and aging stock")
    ContainerDb(db, "Database", "PostgreSQL 16", "Stores vehicles, dealerships, and action logs")
  }

  Rel(manager, frontend, "Uses", "HTTPS")
  Rel(frontend, backend, "API calls", "HTTP/JSON")
  Rel(backend, db, "Reads/Writes", "pgx")
```

### 1.2 High-Level Architecture

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│                  │     │                      │     │              │
│   Next.js App    │────▶│   Go REST API (Chi)  │────▶│  PostgreSQL  │
│   (Browser)      │◀────│                      │◀────│              │
│                  │     │                      │     │              │
└─────────────────┘     └─────────────────────┘     └──────────────┘
      Port 3000              Port 8080                  Port 5432
```

### 1.3 Project Structure

```
intelligent-inventory-dashboard/
├── api/                        # OpenAPI spec (single source of truth)
│   └── openapi.yaml
├── backend/                    # Go backend service
│   ├── cmd/server/             # Application entry point
│   ├── internal/
│   │   ├── handler/            # HTTP handlers (generated + custom)
│   │   ├── service/            # Business logic layer
│   │   ├── repository/         # Database access layer (pgx)
│   │   └── middleware/         # Logging, CORS, request ID
│   ├── migrations/             # golang-migrate SQL files
│   ├── go.mod
│   └── Dockerfile
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   ├── components/         # UI components (shadcn/ui)
│   │   ├── lib/api/            # Generated TypeScript client
│   │   └── hooks/              # TanStack Query hooks
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yaml         # Full stack orchestration
├── Makefile                    # Common commands (generate, migrate, test)
└── docs/                       # Design documents
```

### 1.4 L3 Backend Component Diagram

```mermaid
C4Component
  title Backend API — Component Diagram

  Container_Boundary(api, "Backend API") {
    Component(handler, "HTTP Handlers", "Go, oapi-codegen", "Generated Chi handlers + custom implementations")
    Component(middleware, "Middleware", "Go", "Request ID, Logging, CORS, Duration")
    Component(service, "Service Layer", "Go", "Business logic, validation, aging computation")
    Component(repository, "Repository Layer", "Go, pgx", "Database queries, parameterized SQL")
    Component(config, "Config", "Go", "Environment-based configuration")
    Component(models, "Domain Models", "Go", "Dealership, Vehicle, VehicleAction structs")
  }

  ContainerDb(db, "PostgreSQL 16", "Database", "Stores dealerships, vehicles, vehicle_actions")

  Rel(middleware, handler, "wraps")
  Rel(handler, service, "calls")
  Rel(service, repository, "calls")
  Rel(service, models, "uses")
  Rel(repository, db, "pgx queries")
  Rel(config, handler, "provides DB pool, ports, CORS origins")
```

### 1.5 L3 Frontend Component Diagram

```mermaid
C4Component
  title Frontend App — Component Diagram

  Container_Boundary(fe, "Next.js Frontend") {
    Component(sidebar, "Sidebar", "React, lucide-react", "Icon-based navigation with active state")

    Component(dashboard_page, "Dashboard Page", "React", "Stats cards, charts, recent actions table")
    Component(inventory_page, "Inventory Page", "React", "Filterable, sortable, paginated vehicle table")
    Component(aging_page, "Aging Stock Page", "React", "Pre-filtered aging vehicles with progress bars")
    Component(detail_page, "Vehicle Detail Page", "React", "Info card, action timeline, action form")

    Component(stats_card, "StatsCard", "React", "Reusable metric display card")
    Component(status_badge, "StatusBadge", "React", "Vehicle status indicator")
    Component(action_badge, "ActionBadge", "React", "Action type indicator")
    Component(pagination, "Pagination", "React", "Page navigation with ellipsis")
    Component(vehicle_filters, "VehicleFilters", "React", "Search, make, status, aging toggle")
    Component(aging_bar, "AgingProgressBar", "React", "Visual days-in-stock indicator")
    Component(info_card, "VehicleInfoCard", "React", "Vehicle detail fields display")
    Component(timeline, "ActionTimeline", "React", "Chronological action history")
    Component(action_form, "ActionForm", "React", "Log new action mutation form")
    Component(charts, "Charts", "Recharts", "Bar chart (by make) + Donut chart (by status)")

    Component(hook_summary, "useDashboardSummary", "TanStack Query", "Fetches dashboard aggregates")
    Component(hook_vehicles, "useVehicles", "TanStack Query", "Fetches paginated vehicle list")
    Component(hook_vehicle, "useVehicle", "TanStack Query", "Fetches single vehicle detail")
    Component(hook_action, "useCreateVehicleAction", "TanStack Query", "Mutation: log action")
    Component(api_client, "apiFetch", "TypeScript", "Typed HTTP client wrapper")
  }

  Container(backend, "Backend API", "Go, Chi", "REST API")

  Rel(dashboard_page, hook_summary, "uses")
  Rel(dashboard_page, hook_vehicles, "uses")
  Rel(inventory_page, hook_vehicles, "uses")
  Rel(aging_page, hook_vehicles, "uses")
  Rel(detail_page, hook_vehicle, "uses")
  Rel(detail_page, hook_action, "uses")
  Rel(hook_summary, api_client, "calls")
  Rel(hook_vehicles, api_client, "calls")
  Rel(hook_vehicle, api_client, "calls")
  Rel(hook_action, api_client, "calls")
  Rel(api_client, backend, "HTTP/JSON", "/api/v1/*")
```

### 1.6 Frontend Runtime Flow: Dashboard Data Loading

```mermaid
sequenceDiagram
  participant User
  participant Dashboard as Dashboard Page
  participant TQ as TanStack Query
  participant API as apiFetch
  participant Backend as Backend API

  User->>Dashboard: Navigate to /
  Dashboard->>TQ: useDashboardSummary()
  Dashboard->>TQ: useVehicles({ page_size: 10, order: desc })
  Note over TQ: Both queries fire in parallel (no waterfall)

  TQ->>API: GET /api/v1/dashboard/summary
  TQ->>API: GET /api/v1/vehicles?page_size=10&order=desc
  API->>Backend: HTTP requests (parallel)
  Backend-->>API: 200 DashboardSummary
  Backend-->>API: 200 PaginatedVehicles
  API-->>TQ: Parsed JSON responses
  TQ-->>Dashboard: { data: summary } + { data: vehicles }
  Dashboard->>Dashboard: Render stats, charts, recent actions

  Note over User,Backend: Error Path
  Backend-->>API: 500 Internal Server Error
  API-->>TQ: Throws Error
  TQ-->>Dashboard: { error: Error }
  Dashboard->>User: "Failed to load dashboard data" + Retry button
```

**Key Invariants:**
- Dashboard summary and vehicle list are fetched in parallel (no waterfall)
- Recharts components are dynamically imported (code splitting)
- Recent actions are derived client-side from vehicle action arrays
- TanStack Query caches responses (30s stale time)

**Error Paths:**
| Condition | Response | Rollback |
|-----------|----------|----------|
| API unreachable | Error state with retry button | None — read-only |
| Partial failure (summary OK, vehicles fail) | Dashboard renders stats, vehicles section shows error | None |

### 1.7 Frontend Runtime Flow: Vehicle List Filter/Sort/Paginate

```mermaid
sequenceDiagram
  participant User
  participant Inventory as Inventory Page
  participant Filters as VehicleFilters
  participant State as React State
  participant TQ as TanStack Query
  participant API as apiFetch
  participant Backend as Backend API

  User->>Filters: Type search text / select make / toggle aging
  Filters->>Filters: Debounce search (300ms)
  Filters->>State: Update filters + reset page to 1
  State->>TQ: useVehicles({ make, status, aging, sort_by, order, page })
  Note over TQ: queryKey includes all params → automatic refetch on change
  TQ->>API: GET /api/v1/vehicles?make=Toyota&aging=true&page=1
  API->>Backend: HTTP GET with query params
  Backend-->>API: 200 PaginatedVehicles { items, total, page, total_pages }
  API-->>TQ: Parsed response
  TQ-->>Inventory: { data: PaginatedVehicles }
  Inventory->>Inventory: Client-side search filter (VIN/make/model)
  Inventory->>User: Render filtered table + pagination

  User->>Inventory: Click column header (sort)
  Inventory->>State: Toggle sort_by + order, reset page
  State->>TQ: New query with updated params
  Note over TQ: Previous cache kept until new data arrives

  User->>Inventory: Click page number
  Inventory->>State: Update page number
  State->>TQ: useVehicles with new page
```

**Key Invariants:**
- Search is debounced (300ms) to prevent excessive API calls
- Page resets to 1 when filters change
- Sort toggle cycles: column desc → asc → different column desc
- Client-side search filters the already-fetched page (VIN/make/model text match)

### 1.8 Frontend Runtime Flow: Create Vehicle Action

```mermaid
sequenceDiagram
  participant User
  participant Form as ActionForm
  participant Mutation as useCreateVehicleAction
  participant TQ as TanStack Query
  participant API as apiFetch
  participant Backend as Backend API

  User->>Form: Select action type, enter notes, enter name
  User->>Form: Click "Log Action"
  Form->>Form: Client-side validation (required fields)
  Form->>Mutation: mutate({ action_type, notes, created_by })
  Mutation->>API: POST /api/v1/vehicles/{id}/actions
  API->>Backend: HTTP POST with JSON body
  Backend->>Backend: Validate vehicle exists + action_type enum
  Backend-->>API: 201 VehicleAction
  API-->>Mutation: Parsed response
  Mutation->>TQ: invalidateQueries(["vehicles", vehicleId])
  Mutation->>TQ: invalidateQueries(["vehicles"])
  Mutation->>TQ: invalidateQueries(["dashboard"])
  Note over TQ: Three query invalidations trigger refetch
  Mutation-->>Form: onSuccess callback
  Form->>Form: Reset form fields
  Form->>User: "Action logged successfully!"

  Note over User,Backend: Error Path
  Backend-->>API: 400 Invalid request / 404 Vehicle not found
  API-->>Mutation: Throws Error
  Mutation-->>Form: isError = true
  Form->>User: "Failed to log action. Please try again."
```

**Key Invariants:**
- Actions are append-only (no edit/delete)
- Form requires action_type (enum) and created_by (string)
- On success: three query families are invalidated (vehicle detail, vehicle list, dashboard)
- Server validates action_type against enum — client validation is for UX only

**Error Paths:**
| Condition | Response | Rollback |
|-----------|----------|----------|
| Invalid action_type | 400 from server, form shows error | Form state preserved |
| Vehicle not found | 404 from server, form shows error | Form state preserved |
| Network error | Mutation error state, form shows error | Form state preserved |

### 1.10 Health Check Flow

```mermaid
sequenceDiagram
  participant Client
  participant Middleware as Middleware (RequestID + Logger)
  participant Handler as Health Handler
  participant Service as Health Service
  participant Repo as Health Repository
  participant DB as PostgreSQL

  Client->>Middleware: GET /health
  Middleware->>Middleware: Assign X-Request-ID (UUID)
  Middleware->>Handler: Forward with request_id in context
  Handler->>Service: Check(ctx)
  Service->>Repo: Ping(ctx)
  Repo->>DB: SELECT 1
  DB-->>Repo: OK
  Repo-->>Service: nil (no error)
  Service-->>Handler: HealthStatus{status: healthy, database: connected}
  Handler-->>Middleware: 200 JSON response
  Middleware->>Middleware: Log request (method, path, status, duration_ms, request_id)
  Middleware-->>Client: 200 {status, version, uptime, database, timestamp} + X-Request-ID header

  Note over Client,DB: Error Path
  Client->>Middleware: GET /health
  Middleware->>Handler: Forward request
  Handler->>Service: Check(ctx)
  Service->>Repo: Ping(ctx)
  Repo->>DB: SELECT 1
  DB-->>Repo: connection refused
  Repo-->>Service: error
  Service-->>Handler: HealthStatus{status: unhealthy, database: disconnected}
  Handler-->>Middleware: 503 JSON response
  Middleware-->>Client: 503 {status: unhealthy, database: disconnected}
```

**Key Invariants:**
- Health check always attempts a real database ping — no cached result
- Request ID is always assigned, even for health checks
- Error responses never expose internal details (connection strings, stack traces)

**Error Paths:**
| Condition | Response | Rollback |
|-----------|----------|----------|
| DB connection refused | 503 `{status: unhealthy}` | None — read-only operation |
| DB timeout | 503 `{status: unhealthy}` | None — context cancellation propagates |

### 1.11 Server Startup Flow

```mermaid
flowchart TD
    A[Start] --> B[Load config from env vars]
    B --> C{DATABASE_URL set?}
    C -->|No| D[Exit with error: DATABASE_URL required]
    C -->|Yes| E[Create pgx connection pool]
    E --> F{Pool created?}
    F -->|No| G[Exit with error: failed to create pool]
    F -->|Yes| H[Ping database]
    H --> I{Ping successful?}
    I -->|No| J[Log warning: DB not reachable]
    I -->|Yes| K[DB connected]
    J --> L[Create migrate instance]
    K --> L
    L --> M{Migrations source found?}
    M -->|No| N[Exit with error: migration source not found]
    M -->|Yes| O[Run m.Up]
    O --> P{Migration result?}
    P -->|Error| Q[Exit with error: migration failed]
    P -->|ErrNoChange| R[Log: no new migrations]
    P -->|Success| S[Log: migrations applied]
    R --> T[Create repository layer]
    S --> T
    T --> U[Create service layer]
    U --> V[Create handler layer]
    V --> W[Configure Chi router + middleware]
    W --> X[Start HTTP server on :PORT]
    X --> Y[Wait for SIGINT/SIGTERM]
    Y --> Z[Graceful shutdown with 10s timeout]
    Z --> AA[Server stopped]
```

**Key Invariants:**
- Config validation happens before any I/O (fail fast)
- Migrations run before HTTP server starts (schema is always up-to-date)
- Graceful shutdown waits up to 10s for in-flight requests to complete

**Error Paths:**
| Condition | Response | Rollback |
|-----------|----------|----------|
| DATABASE_URL missing | Exit code 1, error log | None |
| Pool creation failure | Exit code 1, error log | None |
| Migration failure | Exit code 1, error log | None — manual rollback via `make migrate-down` |
| SIGINT/SIGTERM received | Graceful shutdown | In-flight requests complete, pool closed |

---

## 2. Component Descriptions

### 2.1 Frontend (Next.js 14)
- **Role:** Renders the dashboard UI for dealership managers
- **Responsibilities:**
  - Display filterable, paginated vehicle inventory table
  - Highlight aging stock (>90 days) with visual indicators
  - Provide forms for logging actions on aging vehicles
  - Show dashboard summary with aggregated stats
- **Key Libraries:** TanStack Query (data fetching/caching), shadcn/ui (components), Tailwind CSS (styling), openapi-typescript (generated types)

### 2.2 Backend API (Go + Chi)
- **Role:** RESTful API serving business logic
- **Responsibilities:**
  - Validate and route HTTP requests (oapi-codegen generated handlers)
  - Compute aging stock (vehicles with `stocked_at` > 90 days ago)
  - Enforce business rules for action logging
  - Return paginated, filterable results
  - Provide health check and observability endpoints
- **Key Libraries:** Chi (router), oapi-codegen (code generation), pgx (PostgreSQL driver), slog (structured logging), golang-migrate (migrations)

### 2.3 PostgreSQL Database
- **Role:** Persistent data storage
- **Responsibilities:**
  - Store dealership, vehicle, and action log data
  - Support efficient filtering via indexes
  - Provide transactional consistency for action logging

---

## 3. Data Model

### 3.1 Entity Relationship

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ dealerships   │──1:N──│    vehicles       │──1:N──│ vehicle_actions   │
│              │       │                  │       │                  │
│ id (PK)      │       │ id (PK)          │       │ id (PK)          │
│ name         │       │ dealership_id(FK)│       │ vehicle_id (FK)  │
│ location     │       │ make             │       │ action_type      │
│ created_at   │       │ model            │       │ notes            │
│ updated_at   │       │ year             │       │ created_by       │
└──────────────┘       │ vin (UNIQUE)     │       │ created_at       │
                       │ price            │       └──────────────────┘
                       │ status           │
                       │ stocked_at       │
                       │ created_at       │
                       │ updated_at       │
                       └──────────────────┘
```

### 3.2 Schema

```sql
CREATE TABLE dealerships (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    location    VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealership_id   UUID NOT NULL REFERENCES dealerships(id),
    make            VARCHAR(100) NOT NULL,
    model           VARCHAR(100) NOT NULL,
    year            INT NOT NULL,
    vin             VARCHAR(17) UNIQUE NOT NULL,
    price           DECIMAL(12,2),
    status          VARCHAR(50) NOT NULL DEFAULT 'available',
    stocked_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicle_actions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id  UUID NOT NULL REFERENCES vehicles(id),
    action_type VARCHAR(100) NOT NULL,
    notes       TEXT,
    created_by  VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for filter performance
CREATE INDEX idx_vehicles_dealership ON vehicles(dealership_id);
CREATE INDEX idx_vehicles_make ON vehicles(make);
CREATE INDEX idx_vehicles_model ON vehicles(model);
CREATE INDEX idx_vehicles_stocked_at ON vehicles(stocked_at);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicle_actions_vehicle ON vehicle_actions(vehicle_id);
```

### 3.3 Key Design Decisions
- **`stocked_at`** is separate from `created_at` — inventory date may differ from record creation
- **`vehicle_actions`** is append-only — provides full audit trail
- **Aging is computed, not stored** — `NOW() - stocked_at > 90 days` is always evaluated fresh
- **UUID primary keys** — safe for distributed systems, no sequential ID leakage

---

## 4. API Design

### 4.1 Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dealerships` | List all dealerships |
| GET | `/api/v1/vehicles` | List vehicles (filterable, paginated) |
| GET | `/api/v1/vehicles/:id` | Get single vehicle with action history |
| POST | `/api/v1/vehicles/:id/actions` | Log an action for a vehicle |
| GET | `/api/v1/vehicles/:id/actions` | List actions for a vehicle |
| GET | `/api/v1/dashboard/summary` | Aggregated inventory stats |
| GET | `/health` | Health check |

### 4.2 Query Parameters for Vehicle List

| Parameter | Type | Description |
|-----------|------|-------------|
| `dealership_id` | UUID | Filter by dealership |
| `make` | string | Filter by vehicle make |
| `model` | string | Filter by vehicle model |
| `status` | string | Filter by status (available, sold, reserved) |
| `aging` | boolean | If true, only return vehicles >90 days in stock |
| `sort_by` | string | Column to sort by (default: stocked_at) |
| `order` | string | asc or desc (default: desc) |
| `page` | int | Page number (default: 1) |
| `page_size` | int | Items per page (default: 20, max: 100) |

### 4.3 Dashboard Summary Response

```json
{
  "total_vehicles": 150,
  "aging_vehicles": 23,
  "average_days_in_stock": 45.2,
  "by_make": [
    { "make": "Toyota", "count": 35, "aging_count": 5 },
    { "make": "Honda", "count": 28, "aging_count": 8 }
  ],
  "by_status": [
    { "status": "available", "count": 120 },
    { "status": "sold", "count": 25 },
    { "status": "reserved", "count": 5 }
  ]
}
```

---

## 5. Data Flow

### 5.1 Read Flow (Inventory List with Filters)

```
1. Manager applies filters (make: "Toyota", aging: true)
2. Next.js component calls TanStack Query hook: useVehicles({ make: "Toyota", aging: true })
3. TanStack Query checks cache → stale or missing → fetches from API
4. Generated TypeScript client sends: GET /api/v1/vehicles?make=Toyota&aging=true&page=1
5. Chi router matches route → oapi-codegen validates query params
6. Handler calls service.ListVehicles(ctx, filters)
7. Service builds query → repository.FindVehicles(ctx, filters)
8. Repository executes parameterized SQL with WHERE clauses and aging calculation
9. PostgreSQL returns matching rows
10. Response flows back: Repository → Service → Handler → JSON response
11. TanStack Query caches response, UI re-renders with filtered results
```

### 5.2 Write Flow (Log Action on Aging Vehicle)

```
1. Manager selects "Price Reduction Planned" for a vehicle, adds notes
2. Component calls mutation: useCreateAction(vehicleId, { action_type, notes, created_by })
3. TanStack Query triggers optimistic update → UI shows action immediately
4. Generated client sends: POST /api/v1/vehicles/:id/actions with JSON body
5. Chi router → oapi-codegen validates request body
6. Handler calls service.CreateAction(ctx, vehicleId, actionData)
7. Service validates vehicle exists and action_type is valid
8. Repository inserts into vehicle_actions table
9. PostgreSQL commits transaction
10. Success response → TanStack Query confirms update, invalidates vehicle query cache
11. On error → TanStack Query rolls back optimistic update
```

---

## 6. Technology Stack & Justifications

| Technology | Version | Justification |
|------------|---------|---------------|
| **Go** | 1.22+ | Strong typing, high performance, excellent concurrency, stdlib improvements in 1.22 |
| **Chi** | v5 | Lightweight, idiomatic router; stdlib `net/http` compatible; built-in oapi-codegen support |
| **oapi-codegen** | latest | Generates Chi server interfaces + Go types from OpenAPI; eliminates manual API boilerplate |
| **pgx** | v5 | High-performance native PostgreSQL driver; connection pooling; type-safe queries |
| **golang-migrate** | v4 | Explicit SQL migrations; CLI + embeddable; supports up/down migrations |
| **slog** | stdlib | Structured JSON logging; zero external dependencies; Go 1.21+ stdlib |
| **Next.js** | 14 | React framework with App Router; great DX; SSR-capable |
| **TanStack Query** | v5 | Best-in-class data fetching; caching, refetching, optimistic updates |
| **shadcn/ui** | latest | Accessible component primitives (Radix UI); fully customizable; not a dependency |
| **Tailwind CSS** | v3 | Utility-first CSS; consistent styling; purges unused styles |
| **openapi-typescript** | latest | Generates TypeScript types from OpenAPI spec; keeps frontend types in sync |
| **PostgreSQL** | 16 | Mature RDBMS; strong indexing for filters; JSONB for future flexibility |
| **Docker Compose** | v2 | One-command full stack setup; reproducible environments |
| **OpenAPI** | 3.0 | Industry standard API spec; single source of truth for Go + TypeScript types |

---

## 7. Observability Strategy

### 7.1 Structured Logging (slog)

All backend logs are JSON-formatted with consistent fields:

```json
{
  "time": "2026-03-17T10:30:00Z",
  "level": "INFO",
  "msg": "request completed",
  "request_id": "abc-123",
  "method": "GET",
  "path": "/api/v1/vehicles",
  "status": 200,
  "duration_ms": 45,
  "query_params": { "make": "Toyota", "aging": "true" }
}
```

**Log Levels:**
- `INFO` — Request lifecycle, business events (action logged, aging stock detected)
- `WARN` — Slow queries (>500ms), approaching rate limits
- `ERROR` — Failed database operations, unhandled errors

### 7.2 Health Check

`GET /health` returns:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": "2h30m",
  "database": "connected",
  "timestamp": "2026-03-17T10:30:00Z"
}
```

Used by Docker Compose healthcheck for container orchestration.

### 7.3 Request Metrics Middleware

Custom Chi middleware logs per-request:
- Request count by endpoint and status code
- Request duration (p50, p95, p99 via log aggregation)
- Error rate by endpoint

### 7.4 Business Metrics (Logged Events)

- Aging stock count per dealership (logged on dashboard summary requests)
- Actions logged per day (logged on action creation)
- Most common action types

### 7.5 Production Extension Path

For production deployment, the observability stack extends to:

```
┌─────────┐     ┌─────────────┐     ┌───────────┐
│ Go API  │────▶│ OpenTelemetry│────▶│  Jaeger   │  (Distributed Tracing)
│ (slog + │     │  Collector   │────▶│ Prometheus│  (Metrics)
│  OTEL)  │     │              │────▶│ Grafana   │  (Dashboards)
└─────────┘     └─────────────┘     └───────────┘
```

- Add OpenTelemetry SDK to instrument service/repository layers with trace spans
- Export metrics to Prometheus, traces to Jaeger
- Build Grafana dashboards for inventory KPIs and API performance

---

## 8. Frontend Pages

### 8.1 Dashboard Home (`/`)
- Summary cards: total vehicles, aging count, average days in stock
- Bar chart: vehicle count by make
- Pie chart: vehicle status breakdown
- Quick link to aging stock view

### 8.2 Inventory List (`/inventory`)
- Filterable, sortable, paginated data table
- Filter controls: make dropdown, model dropdown, status dropdown, aging toggle
- Columns: VIN, Make, Model, Year, Price, Status, Days in Stock, Last Action
- Aging vehicles highlighted with visual badge
- Click row to navigate to vehicle detail

### 8.3 Aging Stock (`/aging`)
- Pre-filtered view of vehicles >90 days in inventory
- Sorted by days in stock (descending)
- Each row shows: vehicle info, days in stock, last action taken
- Inline action button to quickly log a new action

### 8.4 Vehicle Detail (`/vehicles/:id`)
- Full vehicle information card
- Action history timeline (chronological)
- Form to log new action: action type dropdown + notes textarea
- Action types: "Price Reduction Planned", "Transfer to Another Dealership", "Auction Scheduled", "Marketing Campaign", "Wholesale Offer", "Custom"

---

## 9. Shared Type Generation Workflow

```
api/openapi.yaml  (Single Source of Truth)
       │
       ├──▶  oapi-codegen  ──▶  backend/internal/handler/api.gen.go   (Go types + Chi interfaces)
       │
       └──▶  openapi-typescript  ──▶  frontend/src/lib/api/types.ts   (TypeScript types)
```

**Makefile commands:**
```makefile
generate:        ## Generate both Go and TypeScript types from OpenAPI spec
generate-go:     ## Generate Go server code
generate-ts:     ## Generate TypeScript client types
```

Any API change starts with editing `openapi.yaml`, then running `make generate` to update both sides.

---

## 10. Scalability & Future Considerations

- **Database:** Add read replicas for heavy dashboard queries; partition `vehicles` table by `dealership_id` for multi-tenant scale
- **Caching:** Add Redis for dashboard summary caching (invalidate on writes)
- **Search:** If full-text search is needed, add PostgreSQL full-text indexes or Elasticsearch
- **Authentication:** Add JWT-based auth middleware; role-based access per dealership
- **Real-time:** WebSocket or SSE for live inventory updates across browser sessions
- **Multi-tenancy:** Current schema supports it via `dealership_id`; add row-level security in PostgreSQL

---

## 11. GenAI-Assisted Design Process

### 11.1 How GenAI Was Used

GenAI served as a **collaborative design partner** throughout the system design phase, accelerating decision-making while keeping the human architect in full control of every choice.

### 11.2 Design Phase Workflow

1. **Requirements Decomposition:** The project requirements were provided as input. GenAI helped break them into discrete architectural decisions that needed to be made (database choice, framework selection, shared type strategy, etc.).

2. **Technology Evaluation:** For each decision point, GenAI proposed 2–3 options with trade-off analysis. The human architect evaluated each recommendation and made the final selection. Examples:
   - **Shared type generation:** OpenAPI/Swagger vs Protocol Buffers vs JSON Schema — OpenAPI was selected for its natural fit with REST APIs and mature tooling for both Go and TypeScript.
   - **Database:** PostgreSQL vs SQLite vs MongoDB — PostgreSQL was selected for its relational strength, indexing capabilities, and production readiness.
   - **Go framework:** Chi vs Gin vs stdlib — Chi was selected for its idiomatic design and native oapi-codegen integration.

3. **Iterative Design Validation:** The design document was produced in sections (architecture, data model, API design, data flow, observability). Each section was reviewed and approved before proceeding to the next, ensuring no compounding errors.

4. **Schema & API Design:** GenAI drafted the database schema and REST endpoint design based on the core requirements. The human architect validated that aging stock is computed (not stored), actions are append-only for audit trails, and pagination is included for scalability.

### 11.3 What GenAI Did Well

- **Rapid exploration of trade-offs** — Comparing frameworks and libraries across Go and TypeScript ecosystems in minutes rather than hours of manual research.
- **Consistency enforcement** — Ensuring naming conventions, data types, and API patterns remained consistent across the full design document.
- **Boilerplate reduction** — Generating the complete SQL schema, API endpoint table, and data flow diagrams from high-level requirements.

### 11.4 Where Human Judgment Was Critical

- **Technology selection** — Every technology choice was a human decision. GenAI provided options and recommendations; the architect made the call.
- **Business logic decisions** — The choice to compute aging dynamically rather than store it, the append-only action log pattern, and the separation of `stocked_at` from `created_at` were all human architectural decisions.
- **Scope control** — GenAI tends toward comprehensive solutions. The architect actively scoped down to what was needed (e.g., structured logging over a full OpenTelemetry stack, basic metrics over Grafana dashboards).

### 11.5 Verification Process

- Each design section was reviewed for correctness before being incorporated.
- The final document was validated against the original requirements to ensure all three core requirements (inventory visualization, aging stock identification, actionable insights) were fully addressed.
- Technology justifications were cross-checked to ensure they matched real-world capabilities and version compatibility.
