# Implementer Agent Prompt Template

Use this template when dispatching an implementer agent for a task.

```
Task tool (general-purpose):
  description: "Implement Task N: [task name]"
  prompt: |
    You are implementing Task N: [task name] for the Intelligent Inventory Dashboard.

    ## Task Description

    [FULL TEXT of task from plan - paste it here, don't make agent read file]

    ## Context

    [Scene-setting: where this fits, dependencies, architectural context]
    [Security notes from the plan for this task]

    ## Project Conventions (MUST FOLLOW)

    - **API-first:** All API changes start in `api/openapi.yaml`, then `make generate`
    - **Backend architecture:** handler → service → repository (pgx)
    - **Database:** PostgreSQL 16 with pgx parameterized queries (no ORM)
    - **Logging:** slog (stdlib), JSON format, always include `request_id` in context
    - **Frontend:** Next.js 14 App Router + TanStack Query + shadcn/ui + Tailwind CSS
    - **Generated code:** Don't manually edit `api.gen.go` or `types.ts` — edit `api/openapi.yaml` and run `make generate`
    - **Aging stock:** Always computed (`NOW() - stocked_at > 90 days`), never stored as a field
    - **Vehicle actions:** Append-only (insert only, no update/delete)
    - **Handlers:** In `backend/internal/handler/`
    - **Services:** In `backend/internal/service/`
    - **Repositories:** In `backend/internal/repository/`

    ## Backend/Go Tasks — Required Sub-Skills

    If this task involves any backend or Go work, you MUST follow the `golang-pro` skill. Key requirements:

    1. **Interface design first** — Define small, focused interfaces with composition before implementation
    2. **Idiomatic Go patterns:**
       - Error wrapping with `fmt.Errorf("context: %w", err)` — never bare returns
       - Context propagation (`context.Context` as first parameter on all blocking operations)
       - Early returns for error handling
       - No `panic` for error handling — use explicit error returns
       - No `_` error assignment without justification
    3. **Lint & validate (MANDATORY before reporting back):**
       - `go vet ./...` — must pass
       - `golangci-lint run` — must pass, fix all reported issues
    4. **Testing:**
       - Table-driven tests with subtests (`t.Run`)
       - Always run with `-race` flag: `go test -v -race ./...`
       - Document all exported functions, types, and packages
    5. **Concurrency (if applicable):**
       - Bounded goroutine lifetime via context
       - Error propagation through channels
       - No goroutine leaks on cancellation

    **Non-negotiable backend checklist before reporting back:**
    - [ ] `go vet ./...` passes
    - [ ] `golangci-lint run` passes
    - [ ] All tests pass with `-race` flag
    - [ ] Errors wrapped with `%w` for proper error chains
    - [ ] Context propagated through all layers
    - [ ] No `panic` used for error handling
    - [ ] Interfaces defined before implementations

    ## Frontend/UI Tasks — Required Sub-Skills

    If this task involves any frontend or UI work, you MUST follow these skills FIRST before writing any code:

    1. **`react-best-practices` skill** (CRITICAL — performance) — Follow ALL rules by priority:
       - **P1 Eliminate waterfalls:** `Promise.all()` for independent fetches, defer awaits, Suspense boundaries
       - **P2 Bundle size:** Import directly (no barrel files), `next/dynamic` for heavy components (charts, modals), defer third-party scripts
       - **P3 Server-side:** `React.cache()` for deduplication, minimize data to client, `after()` for non-blocking ops
       - **P4 Client data:** Use SWR/TanStack Query for deduplication
       - **P5 Re-renders:** `React.memo()`, primitive deps, derived state, functional setState, `startTransition`
       - `"use client"` only where needed — keep server components where possible

    2. **`ui-ux-pro-max` skill** — Design system, color palette, typography, accessibility rules, component patterns.

    3. **`responsive-design` skill** — Mobile-first layout with Tailwind CSS.
       - Always start with mobile (unprefixed) styles, enhance at breakpoints
       - Standard Tailwind breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
       - Use 2-3 breakpoints per property max
       - Touch targets must be >= 44x44px
       - No horizontal scroll on mobile

    ### Component Reuse (MANDATORY — Check Before Creating)

    **Before creating ANY new component, search the existing codebase:**

    1. **shadcn/ui primitives** (`frontend/src/components/ui/`) — Button, Card, Table, Dialog, Form, Input, Select, Badge, etc.
    2. **Composed components** (`frontend/src/components/`) — Feature-specific components built on shadcn/ui
    3. **TanStack Query hooks** (`frontend/src/hooks/`) — Data fetching hooks with generated TypeScript types

    **Decision flow:**
    - Need a form field? → Use shadcn/ui Form + Input/Select components
    - Need a modal/dialog? → Use shadcn/ui Dialog
    - Need a data table? → Use shadcn/ui Table or TanStack Table
    - Need a card layout? → Use shadcn/ui Card
    - Need loading/error states? → Create reusable components in `frontend/src/components/`
    - None of the above fit? → Create in `frontend/src/components/` with justification

    **Non-negotiable UI checklist before reporting back:**
    - [ ] Mobile layout works at 375px (no horizontal scroll, touch targets >= 44px)
    - [ ] Desktop layout works at 1024px+
    - [ ] Color contrast >= 4.5:1 for normal text
    - [ ] All interactive elements have `cursor-pointer`
    - [ ] Hover/focus states visible
    - [ ] Images use `next/image` (not plain `<img>`)
    - [ ] Existing shared components reused (not recreated)
    - [ ] No async waterfalls in data fetching

    ## Before You Begin

    If you have questions about:
    - The requirements or acceptance criteria
    - The approach or implementation strategy
    - Security implications of your implementation
    - Dependencies or assumptions
    - Anything unclear

    **Ask them now.** Raise any concerns before starting work.

    ## Your Job — TDD IS MANDATORY

    You MUST follow Test-Driven Development. The order is non-negotiable:

    1. **Write the failing test FIRST** — Before any implementation code
    2. **Run the test** — Verify it fails (RED)
    3. **Write minimal implementation** — Just enough to pass the test (GREEN)
    4. **Run the test** — Verify it passes
    5. **Refactor** — Clean up while tests still pass
    6. **Add input validation** — With its own test
    7. **Add authorization checks** — With its own test
    8. **Run ALL tests** — Verify everything passes
    9. **Self-review** (see below)
    10. **Report back**

    **What to test per layer:**
    - **Backend service:** Business logic, edge cases, error paths, authorization
    - **Backend handler:** HTTP status codes, request validation, auth middleware, error responses
    - **Frontend component:** Rendering, user interaction, loading/error states, form validation

    **Test commands:**
    - Go: `cd backend && go test -v ./internal/path/to/package/...`
    - Frontend: `cd frontend && npm test`

    **Red flags — if you catch yourself doing any of these, STOP:**
    - Writing implementation before the test = violation
    - Writing tests after implementation = NOT TDD
    - Skipping tests for "simple" code = NO EXCEPTIONS
    - Only testing happy path = INSUFFICIENT

    Work from: [directory]

    **While you work:** If you encounter something unexpected, **ask questions**.
    Don't guess on security-related decisions. Don't assume authorization is handled elsewhere.

    ## Security Self-Check (BEFORE reporting)

    Before reporting back, verify:

    - [ ] All user inputs are validated server-side
    - [ ] Authorization checks verify dealership-scoped data access
    - [ ] No sensitive data in logs or error messages
    - [ ] SQL queries use pgx parameterized queries (no string concatenation)
    - [ ] Error responses don't leak internal details
    - [ ] No hardcoded secrets or credentials
    - [ ] XSS prevention: user input is escaped before rendering
    - [ ] Aging stock is computed server-side, never stored
    - [ ] Vehicle actions are insert-only (append-only audit trail)

    ## Before Reporting Back: Self-Review

    Review your work with fresh eyes:

    **Completeness:**
    - Did I fully implement everything in the spec?
    - Did I miss any requirements?
    - Are there edge cases I didn't handle?

    **Security:**
    - Can a malicious user bypass my validation?
    - Can a user access another dealership's data?
    - Am I exposing sensitive information?

    **Quality:**
    - Is this my best work?
    - Are names clear and accurate?
    - Is the code clean and maintainable?

    **Discipline:**
    - Did I avoid overbuilding (YAGNI)?
    - Did I only build what was requested?
    - Did I follow existing patterns in the codebase?

    If you find issues during self-review, fix them before reporting.

    ## Report Format

    When done, report:
    - What you implemented
    - **Test summary (REQUIRED):**
      - Test files created/modified
      - Number of tests: X passing, Y failing
      - What each test covers (behavior, not implementation)
      - Exact command to run tests and output
      - TDD compliance: Did you write tests BEFORE implementation?
    - Files changed (implementation + test files)
    - Security measures implemented
    - Self-review findings (if any)
    - Any issues or concerns

    ## Progress File — NOT Your Responsibility

    The orchestrator (not you) manages the progress file (`docs/reports/YYYY-MM-DD-<feature>-progress.md`).
    After you report back and all three reviews pass, the orchestrator will:
    1. Update the progress file with your task's status and commit hash
    2. Commit your changes + the progress file
    3. Show a summary to the user and wait for approval

    You do NOT need to read, write, or commit the progress file. Just do your task and report back.
```
