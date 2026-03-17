# Code Quality Reviewer Prompt Template

Use this template when dispatching a code quality reviewer agent.

**Purpose:** Verify implementation is well-built (clean, tested, maintainable).

**Only dispatch after BOTH spec compliance AND security review pass.**

```
Task tool (general-purpose):
  description: "Code quality review for Task N"
  prompt: |
    You are reviewing code quality for the Intelligent Inventory Dashboard.

    ## What Was Implemented

    [From implementer's report — summary of changes]

    ## Files Changed

    [List of all changed files]

    ## Your Job

    Read ALL changed files and evaluate code quality.

    ### Code Structure
    - [ ] Follows existing codebase patterns (Layered: handler → service → repository (pgx))
    - [ ] Proper separation of concerns
    - [ ] No business logic in handlers (belongs in service layer)
    - [ ] No direct DB access in handlers (goes through repository)

    ### Code Clarity
    - [ ] Variable and function names are clear and accurate
    - [ ] No dead code or commented-out code
    - [ ] Complex logic has clear comments explaining WHY (not what)
    - [ ] Functions are focused and not too long

    ### TypeScript/React Quality (Frontend)
    - [ ] Proper TypeScript types (minimal `any` usage)
    - [ ] "use client" directive where needed
    - [ ] React hooks follow rules of hooks
    - [ ] No unnecessary re-renders (proper memoization if needed)
    - [ ] Proper error/loading state handling

    ### Frontend Best Practices — `react-best-practices` skill compliance
    - [ ] **P1 No waterfalls**: Independent fetches use `Promise.all()`, not sequential await; awaits deferred into branches
    - [ ] **P2 Bundle size**: Direct imports (no barrel files); `next/dynamic` for heavy components (charts, modals); third-party scripts deferred after hydration
    - [ ] **P3 Server perf**: `React.cache()` for deduplication; minimal data serialized to client; `after()` for non-blocking ops
    - [ ] **P5 Re-renders**: `React.memo()` where needed; primitive deps in effects; derived state; functional setState; `startTransition` for non-urgent updates
    - [ ] **Images**: Uses `next/image` — NOT plain `<img>`
    - [ ] **Component reuse**: shadcn/ui primitives in `components/ui/`, composed into feature components in `components/`
    - [ ] **Responsive**: Mobile-first styles, standard Tailwind breakpoints, 2-3 breakpoints max per property
    - [ ] **Touch targets**: >= 44x44px on mobile, `cursor-pointer` on interactive elements
    - [ ] **Server components**: `"use client"` only where needed — keep server components where possible
    - [ ] **Contrast**: Text contrast >= 4.5:1, hover/focus states visible

    ### Go Quality (Backend) — `golang-pro` skill compliance
    - [ ] Error handling first (early returns)
    - [ ] Errors wrapped with `fmt.Errorf("context: %w", err)` — proper error chains
    - [ ] Context propagation (`context.Context` as first param on blocking ops)
    - [ ] Proper use of pgx (parameterized queries, no string concatenation in SQL)
    - [ ] Resource cleanup (defer for close operations)
    - [ ] No `panic` for error handling — explicit error returns only
    - [ ] No ignored errors (`_` assignment without justification)
    - [ ] Interfaces defined before implementations (small, focused, composed)
    - [ ] `go vet ./...` passes
    - [ ] `golangci-lint run` passes
    - [ ] All exported functions, types, and packages documented
    - [ ] Table-driven tests with subtests (`t.Run`)
    - [ ] Tests run with `-race` flag

    ### Testing
    - [ ] Tests actually verify behavior (not just coverage)
    - [ ] Edge cases covered
    - [ ] Test names describe the behavior being tested
    - [ ] No flaky test patterns

    ### Performance
    - [ ] No N+1 queries (use JOIN queries or batch fetches)
    - [ ] Pagination for list operations
    - [ ] Appropriate caching usage
    - [ ] No unnecessary API calls from frontend

    ### Maintainability
    - [ ] DRY (no copy-paste duplication)
    - [ ] YAGNI (nothing over-engineered)
    - [ ] Changes are backwards compatible (or migration provided)

    ## Report Format

    **Strengths:**
    [What was done well]

    **Issues:**
    - Critical: [must fix — bugs, data integrity risks]
    - Important: [should fix — code quality, patterns]
    - Minor: [nice to fix — style, naming]

    **Verdict: [APPROVED / NEEDS CHANGES]**
```
