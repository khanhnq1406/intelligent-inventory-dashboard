# Project Initialization — Implementation Plan

> **For implementation:** Use the secure-feature-pipeline skill, step: implement

**Goal:** Initialize the full working project structure — OpenAPI spec, Go backend skeleton, Next.js frontend skeleton, PostgreSQL migrations, Docker Compose orchestration, and Makefile — so `docker compose up` starts the entire stack with a working health endpoint.

**Spec:** `docs/specs/2026-03-17-project-init-spec.md`

**Architecture:** Three-tier monorepo: Go backend (Chi + oapi-codegen + pgx) serves a RESTful API, Next.js 14 frontend (TanStack Query + shadcn/ui) renders the dashboard UI, PostgreSQL 16 stores data. OpenAPI spec is the single source of truth — `make generate` produces both Go and TypeScript types.

**Tech Stack:** Go 1.22+ + Chi v5 + oapi-codegen + pgx v5 | Next.js 14 + TanStack Query v5 + shadcn/ui + Tailwind CSS | PostgreSQL 16 | Docker Compose v2

## Security Implementation Notes

- **Authentication:** None in v1 (per spec — out of scope for init)
- **Authorization:** Dealership-scoped queries in service layer (prepared for future auth)
- **Input validation:** oapi-codegen validates request shape; service layer validates business rules
- **Data sanitization:** pgx parameterized queries only (never string concatenation); custom error handler hides internals
- **Secrets:** All via environment variables; `.env.example` documents required vars; `.env` is gitignored

## C4 Architecture Diagram Updates

- Add L3 Backend Component Diagram to `docs/plans/2026-03-17-system-design.md` (from spec)
- Add Health Check Flow sequence diagram to `docs/plans/2026-03-17-system-design.md` (from spec)

---

### Task 0: Update C4 Architecture Diagrams

**Files:**
- Modify: `docs/plans/2026-03-17-system-design.md`

**Steps:**

1. Add L3 Backend Component Diagram (Mermaid C4Component) after existing Container diagram showing: HTTP Handlers, Middleware, Service Layer, Repository Layer, Config — and their dependencies
2. Add Health Check Flow sequence diagram (Mermaid sequenceDiagram) in Section 5 showing: Client → Middleware → Handler → DB ping → response flow
3. Commit: `docs(design): add L3 backend component and health check flow diagrams`

---

### Task 1: Create OpenAPI 3.0 Specification

**Files:**
- Create: `api/openapi.yaml`

**Security notes:** Define proper UUID formats, enum constraints for status/action_type, pagination limits (max page_size=100), and request body validation schemas.

**Step 1: Write the OpenAPI spec**

Create `api/openapi.yaml` with:
- `openapi: "3.0.3"` header with info, servers
- 7 endpoints from system design Section 4:
  - `GET /health` — returns `{status, version, uptime, database, timestamp}`
  - `GET /api/v1/dealerships` — returns array of Dealership objects
  - `GET /api/v1/vehicles` — query params: dealership_id (uuid), make, model, status (enum: available/sold/reserved), aging (boolean), sort_by (enum: stocked_at/price/year/make), order (enum: asc/desc), page (int, min 1), page_size (int, min 1, max 100)
  - `GET /api/v1/vehicles/{id}` — returns Vehicle with actions
  - `POST /api/v1/vehicles/{id}/actions` — body: action_type (enum: price_reduction, transfer, auction, marketing, wholesale, custom), notes, created_by
  - `GET /api/v1/vehicles/{id}/actions` — returns array of VehicleAction
  - `GET /api/v1/dashboard/summary` — returns DashboardSummary
- Component schemas: Dealership, Vehicle, VehicleAction, DashboardSummary, MakeSummary, StatusSummary, PaginatedVehicles (with items, total, page, page_size, total_pages), HealthResponse, ErrorResponse
- All IDs as `format: uuid`
- Pagination wrapper for vehicle list
- Standard error response schema

**Step 2: Validate the spec**

Install and run a spec linter:
```bash
npx @redocly/cli lint api/openapi.yaml
```

**Step 3: Commit**
`feat(api): add OpenAPI 3.0 specification with all 7 endpoints`

---

### Task 2: Initialize Go Backend Module and Dependencies

**Files:**
- Create: `backend/go.mod`
- Create: `backend/go.sum` (generated)
- Create: `backend/tools.go` (for oapi-codegen tool dependency)

**Security notes:** Pin all dependency versions. Use `go mod tidy` to prune unused deps.

**Step 1: Initialize Go module**

```bash
cd backend
go mod init github.com/khanh/intelligent-inventory-dashboard/backend
```

**Step 2: Add dependencies**

```bash
cd backend
go get github.com/go-chi/chi/v5@latest
go get github.com/go-chi/cors@latest
go get github.com/jackc/pgx/v5@latest
go get github.com/google/uuid@latest
go get github.com/oapi-codegen/runtime@latest
go get github.com/golang-migrate/migrate/v4@latest
go get github.com/golang-migrate/migrate/v4/database/postgres@latest
go get github.com/golang-migrate/migrate/v4/source/file@latest
```

**Step 3: Add oapi-codegen tool dependency**

Create `backend/tools.go`:
```go
//go:build tools

package tools

import (
    _ "github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen"
)
```

```bash
cd backend
go get github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@latest
go mod tidy
```

**Step 4: Commit**
`build(backend): initialize Go module with core dependencies`

---

### Task 3: Create Database Migrations

**Files:**
- Create: `backend/migrations/001_init.up.sql`
- Create: `backend/migrations/001_init.down.sql`
- Create: `backend/migrations/002_seed.up.sql`
- Create: `backend/migrations/002_seed.down.sql`

**Security notes:** UUIDs for all PKs (no sequential ID leakage). Parameterized seed data only. No secrets in seed files.

**Step 1: Write 001_init.up.sql**

Exact SQL from system design Section 3.2:
- `CREATE TABLE dealerships (...)` with UUID PK, name, location, timestamps
- `CREATE TABLE vehicles (...)` with UUID PK, FK to dealerships, all fields, UNIQUE vin
- `CREATE TABLE vehicle_actions (...)` with UUID PK, FK to vehicles, append-only design
- All 6 indexes from the schema

**Step 2: Write 001_init.down.sql**

```sql
DROP TABLE IF EXISTS vehicle_actions;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS dealerships;
```

**Step 3: Write 002_seed.up.sql**

Insert realistic but fake seed data:
- 2 dealerships (with hardcoded UUIDs for FK references)
- ~20 vehicles across both dealerships:
  - Mix of makes (Toyota, Honda, Ford, BMW, etc.)
  - Mix of statuses (available, sold, reserved)
  - 5-6 vehicles with `stocked_at` > 90 days ago (aging stock)
  - Various years (2020-2025) and price ranges ($15K-$75K)
  - Valid VIN format (17 chars alphanumeric)
- ~10 vehicle actions across aging vehicles:
  - Mix of action_types: price_reduction, transfer, auction, marketing, wholesale
  - Realistic notes text

**Step 4: Write 002_seed.down.sql**

```sql
DELETE FROM vehicle_actions;
DELETE FROM vehicles;
DELETE FROM dealerships;
```

**Step 5: Commit**
`feat(db): add initial schema migration and seed data`

---

### Task 4: Backend Configuration Module

**Files:**
- Create: `backend/internal/config/config.go`
- Create: `backend/internal/config/config_test.go`

**Security notes:** All secrets from environment variables. Fail fast on missing required vars with clear error messages. Never log secrets.

**Step 1: Write the failing test**

Test that:
- `Load()` reads from env vars: `DATABASE_URL`, `PORT` (default 8080), `CORS_ORIGINS` (default `*`), `LOG_LEVEL` (default `info`)
- Missing `DATABASE_URL` returns error
- Default values work for optional vars

**Step 2: Run test to verify it fails**
```bash
cd backend && go test -v -race ./internal/config/...
```

**Step 3: Write config implementation**

```go
package config

type Config struct {
    DatabaseURL string
    Port        int
    CORSOrigins []string
    LogLevel    string
}

func Load() (*Config, error) { ... }
```

Read from env vars with defaults. Return error if DATABASE_URL is empty.

**Step 4: Run test to verify it passes**
```bash
cd backend && go test -v -race ./internal/config/...
```

**Step 5: Commit**
`feat(backend): add environment-based configuration module`

---

### Task 5: Backend Middleware (Request ID, Logging, CORS)

**Files:**
- Create: `backend/internal/middleware/request_id.go`
- Create: `backend/internal/middleware/logger.go`
- Create: `backend/internal/middleware/middleware_test.go`

**Security notes:** Request ID generated server-side (UUID). Logger must NOT log request bodies (may contain sensitive data). CORS origins configurable via env var.

**Step 1: Write the failing test**

Test RequestID middleware:
- Sets `X-Request-ID` response header
- Injects request_id into request context
- Uses provided `X-Request-ID` from client if present (but validate format)

Test Logger middleware:
- Logs method, path, status code, duration_ms, request_id
- Uses `slog` with JSON handler

**Step 2: Run test to verify it fails**
```bash
cd backend && go test -v -race ./internal/middleware/...
```

**Step 3: Write middleware implementations**

- `RequestID`: Generate UUID, set on context + response header
- `Logger`: slog-based structured logger with request_id, method, path, status, duration
- CORS: Use `github.com/go-chi/cors` with configurable origins

**Step 4: Run test to verify it passes**
```bash
cd backend && go test -v -race ./internal/middleware/...
```

**Step 5: Commit**
`feat(backend): add request ID, logging, and CORS middleware`

---

### Task 6: Generate Go Server Code from OpenAPI

**Files:**
- Create: `backend/internal/handler/oapi-codegen.cfg.yaml`
- Create (generated): `backend/internal/handler/api.gen.go`

**Security notes:** Generated code is read-only — never hand-edit. Review generated validators for completeness.

**Step 1: Create oapi-codegen config**

```yaml
package: handler
output: api.gen.go
generate:
  chi-server: true
  models: true
  strict-server: true
```

**Step 2: Run code generation**

```bash
cd backend && go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen \
  --config internal/handler/oapi-codegen.cfg.yaml \
  ../api/openapi.yaml
```

**Step 3: Verify compilation**
```bash
cd backend && go build ./...
```

**Step 4: Commit**
`build(backend): add oapi-codegen config and generate server code`

---

### Task 7: Backend Repository Layer (Interfaces + Health Check)

**Files:**
- Create: `backend/internal/repository/repository.go` (interfaces)
- Create: `backend/internal/repository/health.go` (health check implementation)
- Create: `backend/internal/repository/health_test.go`

**Security notes:** Repository uses pgx parameterized queries only. Health check uses `db.Ping()` — no data exposure.

**Step 1: Write the failing test**

Test HealthRepository:
- `Ping(ctx)` returns nil on successful DB connection
- `Ping(ctx)` returns error on failed connection

Use a mock/interface for pgx pool in tests.

**Step 2: Run test to verify it fails**
```bash
cd backend && go test -v -race ./internal/repository/...
```

**Step 3: Write repository interfaces and health implementation**

```go
package repository

type HealthRepository interface {
    Ping(ctx context.Context) error
}

type DealershipRepository interface {
    List(ctx context.Context) ([]models.Dealership, error)
}

type VehicleRepository interface {
    List(ctx context.Context, filters VehicleFilters) ([]models.Vehicle, int, error)
    GetByID(ctx context.Context, id uuid.UUID) (*models.Vehicle, error)
}

type VehicleActionRepository interface {
    Create(ctx context.Context, action models.VehicleAction) (*models.VehicleAction, error)
    ListByVehicleID(ctx context.Context, vehicleID uuid.UUID) ([]models.VehicleAction, error)
}

type DashboardRepository interface {
    GetSummary(ctx context.Context) (*models.DashboardSummary, error)
}
```

Health implementation: `pgxHealth` struct with pool, implements `Ping()` via `pool.Ping(ctx)`.

**Step 4: Run test to verify it passes**
```bash
cd backend && go test -v -race ./internal/repository/...
```

**Step 5: Commit**
`feat(backend): add repository interfaces and health check implementation`

---

### Task 8: Backend Domain Models

**Files:**
- Create: `backend/internal/models/models.go`

**Security notes:** Models are plain Go structs. No business logic in models. JSON tags must not expose internal fields.

**Step 1: Write domain models**

```go
package models

type Dealership struct { ... }
type Vehicle struct { ... }
type VehicleAction struct { ... }
type DashboardSummary struct { ... }
type MakeSummary struct { ... }
type StatusSummary struct { ... }
type VehicleFilters struct { ... }
```

Fields match the database schema from system design Section 3.2. Include JSON tags for API serialization.

**Step 2: Verify compilation**
```bash
cd backend && go build ./...
```

**Step 3: Commit**
`feat(backend): add domain models for dealership, vehicle, and actions`

---

### Task 9: Backend Service Layer (Interfaces + Health Check)

**Files:**
- Create: `backend/internal/service/service.go` (interfaces)
- Create: `backend/internal/service/health.go` (health service implementation)
- Create: `backend/internal/service/health_test.go`

**Security notes:** Service layer is where business validation lives. Health service only exposes status — no internal config details.

**Step 1: Write the failing test**

Test HealthService:
- `Check(ctx)` returns healthy status when DB ping succeeds
- `Check(ctx)` returns unhealthy status when DB ping fails
- Response includes: status, version, database connectivity

**Step 2: Run test to verify it fails**
```bash
cd backend && go test -v -race ./internal/service/...
```

**Step 3: Write service interfaces and health implementation**

```go
package service

type HealthService interface {
    Check(ctx context.Context) (*models.HealthStatus, error)
}

type DealershipService interface {
    List(ctx context.Context) ([]models.Dealership, error)
}

type VehicleService interface {
    List(ctx context.Context, filters models.VehicleFilters) (*models.PaginatedVehicles, error)
    GetByID(ctx context.Context, id uuid.UUID) (*models.Vehicle, error)
}

type VehicleActionService interface {
    Create(ctx context.Context, vehicleID uuid.UUID, input models.CreateActionInput) (*models.VehicleAction, error)
    ListByVehicleID(ctx context.Context, vehicleID uuid.UUID) ([]models.VehicleAction, error)
}

type DashboardService interface {
    GetSummary(ctx context.Context) (*models.DashboardSummary, error)
}
```

Health implementation: inject HealthRepository, call Ping, build status response.

**Step 4: Run test to verify it passes**
```bash
cd backend && go test -v -race ./internal/service/...
```

**Step 5: Commit**
`feat(backend): add service interfaces and health check service`

---

### Task 10: Backend Handler (Stub Implementation + Health Endpoint)

**Files:**
- Create: `backend/internal/handler/handler.go`
- Create: `backend/internal/handler/handler_test.go`

**Security notes:** Handler must sanitize error responses — never expose stack traces or internal details. Health endpoint is public (no auth required).

**Step 1: Write the failing test**

Test health handler:
- `GET /health` returns 200 with `{status: "healthy", database: "connected"}` when DB is up
- `GET /health` returns 503 with `{status: "unhealthy", database: "disconnected"}` when DB is down

**Step 2: Run test to verify it fails**
```bash
cd backend && go test -v -race ./internal/handler/...
```

**Step 3: Write handler implementation**

Create `Server` struct that implements the oapi-codegen `StrictServerInterface`. Implement:
- `GetHealth` — calls HealthService.Check(), returns appropriate response
- All other methods — return `501 Not Implemented` stub responses

**Step 4: Run test to verify it passes**
```bash
cd backend && go test -v -race ./internal/handler/...
```

**Step 5: Commit**
`feat(backend): add handler with working health endpoint and stubs`

---

### Task 11: Backend Main Entry Point

**Files:**
- Create: `backend/cmd/server/main.go`

**Security notes:** Graceful shutdown with signal handling. DB connection pool limits. No secrets in logs.

**Step 1: Write main.go**

- Load config from environment
- Create pgx connection pool with context
- Create repository, service, handler layers (dependency injection)
- Set up Chi router with middleware chain: RequestID → Logger → CORS → oapi-codegen handlers
- Register health endpoint outside oapi-codegen (or inside, depending on generated code)
- Start HTTP server on configured port
- Graceful shutdown on SIGINT/SIGTERM with 10s timeout
- Log startup message with port

**Step 2: Verify compilation**
```bash
cd backend && go build -o bin/server ./cmd/server/
```

**Step 3: Verify `go vet` passes**
```bash
cd backend && go vet ./...
```

**Step 4: Commit**
`feat(backend): add server entry point with graceful shutdown`

---

### Task 12: Makefile and Code Generation Pipeline

**Files:**
- Create: `Makefile`
- Create: `.env.example`

**Security notes:** `.env.example` has placeholder values only (no real secrets). Makefile commands should not echo secrets.

**Step 1: Write Makefile**

Targets:
- `generate`: runs `generate-go` and `generate-ts`
- `generate-go`: runs oapi-codegen with config file
- `generate-ts`: runs `npx openapi-typescript` (from frontend dir)
- `migrate-up`: runs golang-migrate up against DATABASE_URL
- `migrate-down`: runs golang-migrate down 1 against DATABASE_URL
- `test`: runs `cd backend && go test ./...` and `cd frontend && npm test`
- `dev`: `docker compose up`
- `lint`: `cd backend && go vet ./...`

**Step 2: Write .env.example**

```env
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/inventory?sslmode=disable
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=inventory

# Backend
PORT=8080
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=info

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8080
```

**Step 3: Test `make generate-go`**
```bash
make generate-go
cd backend && go build ./...
```

**Step 4: Commit**
`build: add Makefile with code generation, migration, and test targets`

---

### Task 13: Initialize Next.js 14 Frontend

**Files:**
- Create: `frontend/` (entire Next.js project via `create-next-app`)
- Modify: `frontend/package.json` (add TanStack Query, openapi-typescript)
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/src/app/layout.tsx`

**Security notes:** No API keys in frontend code. API URL from environment variable (`NEXT_PUBLIC_API_URL`).

**Step 1: Create Next.js project**

```bash
npx create-next-app@14 frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

**Step 2: Install additional dependencies**

```bash
cd frontend
npm install @tanstack/react-query@5
npm install -D openapi-typescript
```

**Step 3: Initialize shadcn/ui**

```bash
cd frontend
npx shadcn@latest init
```

Select: New York style, slate base color, CSS variables.

**Step 4: Add base shadcn components**

```bash
cd frontend
npx shadcn@latest add button card badge table
```

**Step 5: Verify build**
```bash
cd frontend && npm run build
```

**Step 6: Commit**
`feat(frontend): initialize Next.js 14 with shadcn/ui and TanStack Query`

---

### Task 14: Generate TypeScript Types from OpenAPI

**Files:**
- Create (generated): `frontend/src/lib/api/types.ts`
- Create: `frontend/src/lib/api/client.ts` (API client helper)

**Security notes:** Generated types are read-only. API client uses configured base URL from env var.

**Step 1: Run TypeScript generation**

```bash
cd frontend && npx openapi-typescript ../api/openapi.yaml -o src/lib/api/types.ts
```

**Step 2: Create API client helper**

```typescript
// frontend/src/lib/api/client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

**Step 3: Test `make generate-ts`**
```bash
make generate-ts
cd frontend && npm run build
```

**Step 4: Commit**
`feat(frontend): generate TypeScript types and add API client`

---

### Task 15: Frontend TanStack Query Provider and Layout

**Files:**
- Create: `frontend/src/lib/providers.tsx` (QueryClientProvider)
- Modify: `frontend/src/app/layout.tsx` (wrap with providers)
- Create: `frontend/src/components/nav.tsx` (navigation component)

**Security notes:** No sensitive data in client-side state. TanStack Query defaults: staleTime 30s, no background refetch on hidden tab.

**Step 1: Create QueryClient provider**

```typescript
// frontend/src/lib/providers.tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
```

**Step 2: Create navigation component**

```typescript
// frontend/src/components/nav.tsx
// Links: Dashboard (/), Inventory (/inventory), Aging Stock (/aging)
// Use Next.js Link component
// Active link styling with usePathname()
```

**Step 3: Update root layout**

Wrap children with QueryClientProvider. Add Nav component. Basic responsive layout shell.

**Step 4: Verify build**
```bash
cd frontend && npm run build
```

**Step 5: Commit**
`feat(frontend): add TanStack Query provider and navigation layout`

---

### Task 16: Frontend Placeholder Pages

**Files:**
- Modify: `frontend/src/app/page.tsx` (dashboard home)
- Create: `frontend/src/app/inventory/page.tsx`
- Create: `frontend/src/app/aging/page.tsx`
- Create: `frontend/src/app/vehicles/[id]/page.tsx`

**Security notes:** Placeholder pages have no data fetching yet — static content only.

**Step 1: Create placeholder pages**

Each page gets:
- Page title (h1)
- Brief description of what will be built
- Link to related pages where appropriate

Pages:
- `/` — "Dashboard" — summary cards placeholder
- `/inventory` — "Vehicle Inventory" — table placeholder
- `/aging` — "Aging Stock" — filtered view placeholder
- `/vehicles/[id]` — "Vehicle Detail" — detail card placeholder

**Step 2: Add a basic test**

Create `frontend/src/__tests__/page.test.tsx`:
- Test that home page renders "Dashboard" heading
- Use React Testing Library

```bash
cd frontend
npm install -D @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom @types/jest ts-jest
```

Configure Jest for Next.js.

**Step 3: Run test**
```bash
cd frontend && npm test
```

**Step 4: Verify full build**
```bash
cd frontend && npm run build
```

**Step 5: Commit**
`feat(frontend): add placeholder pages for all 4 routes`

---

### Task 17: Docker Configuration

**Files:**
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `docker-compose.yaml`

**Security notes:** Multi-stage builds (no build tools in production image). Non-root user in containers. No secrets baked into images. Health checks for all services.

**Step 1: Write backend Dockerfile**

```dockerfile
# Build stage
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /server ./cmd/server/

# Run stage
FROM alpine:3.19
RUN adduser -D appuser
COPY --from=builder /server /server
COPY migrations/ /migrations/
USER appuser
EXPOSE 8080
CMD ["/server"]
```

**Step 2: Write frontend Dockerfile**

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Run stage
FROM node:18-alpine
WORKDIR /app
RUN adduser -D appuser
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER appuser
EXPOSE 3000
CMD ["node", "server.js"]
```

Update `frontend/next.config.ts` to add `output: "standalone"` for Docker.

**Step 3: Write docker-compose.yaml**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-inventory}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build: ./backend
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@db:5432/${POSTGRES_DB:-inventory}?sslmode=disable
      PORT: 8080
      CORS_ORIGINS: http://localhost:3000
    ports:
      - "8080:8080"
    depends_on:
      db:
        condition: service_healthy

  web:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: http://api:8080
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  pgdata:
```

**Step 4: Commit**
`build: add Dockerfiles and docker-compose orchestration`

---

### Task 18: Database Migration Runner in Backend

**Files:**
- Modify: `backend/cmd/server/main.go` (add migration on startup)

**Security notes:** Migrations run at startup — only forward migrations. Rollback is manual via `make migrate-down`. Migration files embedded or read from filesystem.

**Step 1: Add migration logic to main.go**

Before starting the HTTP server:
1. Create migrate instance from `file://migrations` source and database URL
2. Run `m.Up()` — applies all pending migrations
3. If `ErrNoChange`, log info and continue
4. If other error, fail startup with clear message

**Step 2: Test locally (requires DB)**

This is verified in Task 19 (Docker Compose integration test).

**Step 3: Commit**
`feat(backend): run database migrations on startup`

---

### Task 19: Integration Test — Docker Compose Full Stack

**Files:**
- No new files — this is a verification task

**Security notes:** Verify health endpoint doesn't expose internal config. Verify DB is not accessible from outside Docker network on production (OK for dev).

**Step 1: Build and start all services**

```bash
docker compose up --build -d
```

**Step 2: Wait for healthy state**

```bash
docker compose ps  # All services should be "healthy" or "running"
```

**Step 3: Test health endpoint**

```bash
curl http://localhost:8080/health
# Expected: {"status":"healthy","database":"connected",...}
```

**Step 4: Test frontend loads**

```bash
curl -s http://localhost:3000 | head -20
# Expected: HTML content with "Dashboard" title
```

**Step 5: Test API stub endpoints**

```bash
curl http://localhost:8080/api/v1/dealerships
# Expected: 501 Not Implemented (or empty array if we stub it)
```

**Step 6: Verify database has seed data**

```bash
docker compose exec db psql -U postgres -d inventory -c "SELECT count(*) FROM vehicles;"
# Expected: ~20
```

**Step 7: Tear down**

```bash
docker compose down -v
```

**Step 8: Commit (if any fixes were needed)**
`fix: resolve Docker Compose integration issues`

---

### Task 20: Create/Update Runtime Flow Diagrams

**Files:**
- Modify: `docs/plans/2026-03-17-system-design.md`

**Steps:**

1. Read the implemented `main.go` and middleware to trace actual startup and request flow
2. Update the Health Check Flow diagram in system design doc to match actual implementation (if it differs from the spec draft)
3. Add a Server Startup Flow diagram:
   - Load config → Connect DB → Run migrations → Create layers → Register routes → Start server → Wait for shutdown signal → Graceful shutdown
4. Include error paths (DB connection failure, migration failure)
5. Add "Key Invariants" and "Error Paths" table after each diagram

**Step 6: Commit**
`docs(design): update runtime flow diagrams with actual implementation`

---

## Task Dependency Graph

```
Task 0  (C4 diagrams)           — independent
Task 1  (OpenAPI spec)          — independent
Task 2  (Go module init)        — independent
Task 3  (DB migrations)         — independent
Task 8  (Domain models)         — depends on Task 2

Task 4  (Config)                — depends on Task 2
Task 5  (Middleware)            — depends on Task 2
Task 6  (Code generation)      — depends on Task 1, Task 2
Task 7  (Repository)           — depends on Task 2, Task 8
Task 9  (Service)              — depends on Task 7, Task 8
Task 10 (Handler)              — depends on Task 6, Task 9
Task 11 (Main entry)           — depends on Task 4, Task 5, Task 10

Task 12 (Makefile + .env)      — depends on Task 1, Task 6
Task 13 (Next.js init)         — independent
Task 14 (TS types)             — depends on Task 1, Task 13
Task 15 (Provider + Layout)    — depends on Task 13
Task 16 (Placeholder pages)    — depends on Task 15
Task 17 (Docker)               — depends on Task 11, Task 16
Task 18 (Migration runner)     — depends on Task 3, Task 11
Task 19 (Integration test)     — depends on Task 17, Task 18
Task 20 (Flow diagrams)        — depends on Task 19
```

## Parallel Execution Plan

**Batch 1 (fully independent):**
- Task 0 (C4 diagrams)
- Task 1 (OpenAPI spec)
- Task 2 (Go module init)
- Task 3 (DB migrations)
- Task 13 (Next.js init)

**Batch 2 (depend on Batch 1):**
- Task 4 (Config) — needs Task 2
- Task 5 (Middleware) — needs Task 2
- Task 6 (Code gen) — needs Task 1, 2
- Task 8 (Domain models) — needs Task 2
- Task 14 (TS types) — needs Task 1, 13
- Task 15 (Provider + Layout) — needs Task 13

**Batch 3 (depend on Batch 2):**
- Task 7 (Repository) — needs Task 2, 8
- Task 9 (Service) — needs Task 7, 8
- Task 12 (Makefile) — needs Task 1, 6
- Task 16 (Placeholder pages) — needs Task 15

**Batch 4 (depend on Batch 3):**
- Task 10 (Handler) — needs Task 6, 9

**Batch 5 (depend on Batch 4):**
- Task 11 (Main entry) — needs Task 4, 5, 10

**Batch 6 (depend on Batch 5):**
- Task 17 (Docker) — needs Task 11, 16
- Task 18 (Migration runner) — needs Task 3, 11

**Batch 7 (final verification):**
- Task 19 (Integration test) — needs Task 17, 18

**Batch 8 (documentation):**
- Task 20 (Flow diagrams) — needs Task 19
