# Intelligent Inventory Dashboard

A real-time inventory management dashboard for dealership managers — providing vehicle stock overview, aging stock identification (>90 days), and actionable insights.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.22+, Chi v5, oapi-codegen, pgx v5 |
| Frontend | Next.js 14, TanStack Query v5, shadcn/ui, Tailwind CSS |
| Database | PostgreSQL 16 |
| API Spec | OpenAPI 3.0 (shared type generation for Go + TypeScript) |
| DevOps | Docker Compose v2, golang-migrate |

## Architecture

Three-tier monorepo with a single OpenAPI spec as the source of truth for shared types:

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│   Next.js App    │────▶│   Go REST API (Chi)  │────▶│  PostgreSQL  │
│   (Browser)      │◀────│                      │◀────│              │
└─────────────────┘     └─────────────────────┘     └──────────────┘
      Port 3000              Port 8080                  Port 5432
```

```
api/openapi.yaml  →  oapi-codegen      →  backend/internal/handler/api.gen.go
                  →  openapi-typescript  →  frontend/src/lib/api/types.ts
```

**Backend** follows a layered architecture: `handler/` (HTTP) → `service/` (business logic) → `repository/` (database).

**Frontend** uses Next.js App Router with TanStack Query hooks for data fetching and shadcn/ui components.

See [`docs/plans/2026-03-17-system-design.md`](docs/plans/2026-03-17-system-design.md) for the full system design document with C4 diagrams.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- [Go](https://go.dev/dl/) 1.22+ (for local backend development)
- [Node.js](https://nodejs.org/) 18+ and npm (for local frontend development)
- [Make](https://www.gnu.org/software/make/) (for running project commands)

## Quick Start

### Run the Full Stack (Docker Compose)

```bash
# Start all services: PostgreSQL, backend API, frontend app
docker compose up

# Stop all services
docker compose down
```

Once running:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8080/api/v1
- **Health check:** http://localhost:8080/health

### Run Services Individually

#### Database

```bash
# Start PostgreSQL only
docker compose up db

# Apply migrations
make migrate-up

# Rollback last migration
make migrate-down
```

#### Backend

```bash
cd backend
go run ./cmd/server            # Start API server on port 8080
```

#### Frontend

```bash
cd frontend
npm install                    # Install dependencies (first time)
npm run dev                    # Start dev server on port 3000
```

## Code Generation

The OpenAPI spec (`api/openapi.yaml`) is the single source of truth. After editing it:

```bash
make generate                  # Generate both Go and TypeScript types
make generate-go               # Generate Go server code only
make generate-ts               # Generate TypeScript client types only
```

Never manually edit generated files (`api.gen.go`, `types.ts`).

## Testing

### Backend Tests

```bash
cd backend
go test ./...                  # Run all tests
go test ./internal/service/... # Run service layer tests only
go test -v -run TestName ./internal/service/...  # Run a single test
```

### Frontend Tests

```bash
cd frontend
npm test                       # Run all tests
npm run lint                   # Lint code
```

## Project Structure

```
intelligent-inventory-dashboard/
├── api/
│   └── openapi.yaml               # OpenAPI spec (single source of truth)
├── backend/
│   ├── cmd/server/                 # Application entry point
│   ├── internal/
│   │   ├── handler/                # HTTP handlers (generated + custom)
│   │   ├── service/                # Business logic layer
│   │   ├── repository/             # Database access layer (pgx)
│   │   └── middleware/             # Logging, CORS, request ID
│   ├── migrations/                 # SQL migration files
│   ├── go.mod
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js App Router pages
│   │   ├── components/             # UI components (shadcn/ui)
│   │   ├── lib/api/                # Generated TypeScript client
│   │   └── hooks/                  # TanStack Query hooks
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yaml             # Full stack orchestration
├── Makefile                        # Common commands
└── docs/
    ├── requirements.md             # Project requirements
    └── plans/
        └── 2026-03-17-system-design.md  # System design document
```

## API Endpoints

All endpoints are prefixed with `/api/v1`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dealerships` | List all dealerships |
| GET | `/api/v1/vehicles` | List vehicles (filterable, paginated) |
| GET | `/api/v1/vehicles/:id` | Get single vehicle with action history |
| POST | `/api/v1/vehicles/:id/actions` | Log an action for a vehicle |
| GET | `/api/v1/vehicles/:id/actions` | List actions for a vehicle |
| GET | `/api/v1/dashboard/summary` | Aggregated inventory stats |
| GET | `/health` | Health check |

### Vehicle List Query Parameters

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

## Key Design Decisions

- **Aging is computed, not stored** — `NOW() - stocked_at > 90 days` is always evaluated fresh, avoiding stale data.
- **Append-only action log** — `vehicle_actions` table provides a full audit trail. Actions are never edited or deleted.
- **OpenAPI as single source of truth** — One spec generates both Go server interfaces and TypeScript client types, eliminating type drift.
- **`stocked_at` vs `created_at`** — Inventory date is tracked separately from record creation, as vehicles may be restocked or backdated.

---

## Collaboration Narrative

### High-Level Strategy for Guiding Development

The development of this application followed a **design-first, human-directed** approach. The process began with a clear set of requirements (inventory visualization, aging stock identification, and actionable insights) and proceeded through two distinct phases:

1. **System Design Phase** — Before writing any implementation code, a comprehensive system design document was produced. This document covered architecture, data model, API design, data flows, technology choices, and observability strategy. Every architectural decision was made deliberately, with trade-offs evaluated before committing to a direction. This upfront investment prevented costly rework during implementation.

2. **Implementation Phase** — With the design document as a blueprint, implementation proceeded component by component: OpenAPI specification first (establishing the contract), then backend (database → repository → service → handler), then frontend (data fetching hooks → components → pages). This bottom-up approach ensured each layer was tested before building on top of it.

The guiding principle was: **make decisions explicit, then execute them systematically**. Rather than exploring solutions through trial-and-error in code, decisions were captured in the design document first, validated against requirements, and only then translated into implementation.

### Process for Verifying and Refining Output

Verification happened at multiple levels throughout the development process:

- **Design validation** — Each section of the system design document was reviewed against the original requirements to ensure all three core requirements were addressed. Technology choices were cross-checked for version compatibility and real-world suitability.

- **Contract-first development** — The OpenAPI specification served as a verifiable contract between frontend and backend. Both sides generated their types from this single spec, making type mismatches structurally impossible.

- **Layered testing** — Business logic tests in the service layer validated core rules (aging calculation, action validation, pagination). Repository tests verified database queries. Handler tests confirmed HTTP request/response mapping. Each layer was tested independently before integration.

- **Iterative refinement** — When implementation revealed edge cases not covered by the initial design (e.g., pagination boundary conditions, concurrent action logging), the design document was updated to reflect the refined understanding, keeping documentation and code in sync.

### How Final Code Quality Was Ensured

Code quality was maintained through a combination of structural decisions and active verification:

- **Generated code over handwritten boilerplate** — HTTP handlers and TypeScript types were generated from the OpenAPI spec, eliminating an entire class of manual errors (typos in route paths, mismatched request/response types, inconsistent parameter names).

- **Strict architectural boundaries** — The layered backend architecture (handler → service → repository) enforced separation of concerns. Business logic lived exclusively in the service layer, database queries exclusively in the repository layer, and HTTP concerns exclusively in the handler layer. This made each component independently testable and reviewable.

- **Structured logging and observability** — Every request was tracked with a unique request ID through structured JSON logging. This provided immediate visibility into application behavior without requiring additional debugging infrastructure.

- **Code review against the design document** — Implementation was continuously compared against the system design document to verify it matched the intended architecture. Any deviation was either corrected (if it was a mistake) or the design document was updated (if the deviation was an improvement).

- **Defensive design patterns** — UUID primary keys for safety, parameterized SQL queries to prevent injection, computed aging values to avoid stale data, and append-only audit logs to prevent data loss were all structural choices that reduced the surface area for bugs.