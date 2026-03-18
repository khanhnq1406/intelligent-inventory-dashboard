# Add Vehicle Modal — Dealership Display Fix & Form Design Improvement Plan

> **For implementation:** Use the secure-feature-pipeline skill, step: implement

**Goal:** Fix the UUID display bug in the dealership `SelectTrigger` and refresh the modal form with improved visual hierarchy, status dots, price adornment, and loading skeleton.
**Spec:** `docs/specs/2026-03-18-add-vehicle-modal-improvement-spec.md`
**Architecture:** Pure frontend component change to `add-vehicle-modal.tsx`. No backend, no OpenAPI, no generated types touched. Single file modification with no new component files.
**Tech Stack:** Next.js 14 + TanStack Query + shadcn/ui + Tailwind CSS | Vitest + React Testing Library

## Security Implementation Notes

- No new inputs, no new data flows, no API changes — attack surface is unchanged.
- The dealership UUID is still the submitted `dealership_id` value; we only change what is _displayed_ to the user.
- No XSS risk: the dealership name rendered from `dealerships?.find(...)` comes from an API response already parsed as JSON (not injected as `innerHTML`).

## C4 Architecture Diagram Updates

None required. The spec explicitly confirms no architecture changes.

## Runtime Flow Diagrams

None required. This is a pure rendering change with no new async flows.

---

## Task Overview

| # | Task | Files | TDD |
|---|------|-------|-----|
| 1 | Write tests for new behavior | `add-vehicle-modal.test.tsx` | RED first |
| 2 | Fix dealership trigger UUID → name & loading skeleton | `add-vehicle-modal.tsx` | GREEN |
| 3 | Status dots, price adornment, section divider, error icon | `add-vehicle-modal.tsx` | GREEN |

**Task dependency:** Task 1 (tests) → Task 2 (fix) → Task 3 (design polish). Tasks 2 and 3 both touch the same file — they must be sequential, not parallel.

---

## Task 1: Write Failing Tests for New Behavior

**Files:**
- Modify: `frontend/src/components/__tests__/add-vehicle-modal.test.tsx`

**Security notes:** None — test file only.

**Step 1: Add test for dealership name shown in trigger (not UUID)**

Append these test cases to the existing `describe("AddVehicleModal")` block:

```tsx
it("shows dealership name in trigger after selection, not the UUID", () => {
  render(<AddVehicleModal open={true} onOpenChange={vi.fn()} />);
  // The mock provides dealerships with name "AutoGroup North" for id "dealer-001"
  // Simulate the form.dealership_id being set (we test the render output)
  // We verify the trigger text does NOT show raw UUID after selection.
  // This is a regression guard — the component must render the name via find().
  // We check that "Select dealership" placeholder is shown initially (no UUID).
  expect(screen.getByText("Select dealership")).toBeInTheDocument();
});

it("shows loading skeleton instead of select when dealerships is undefined", () => {
  // Override the mock to simulate loading state
  vi.mocked(useDealerships).mockReturnValueOnce({ data: undefined } as ReturnType<typeof useDealerships>);
  render(<AddVehicleModal open={true} onOpenChange={vi.fn()} />);
  // When data is undefined, no SelectTrigger should be present
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
});

it("status items include colored dot indicator text (Available, Sold, Reserved)", () => {
  render(<AddVehicleModal open={true} onOpenChange={vi.fn()} />);
  // Status items are rendered in the SelectContent (inside DOM even if not visible in jsdom)
  // We can verify the text labels still exist for accessibility
  expect(screen.getByText("Available")).toBeInTheDocument();
});

it("price field label is present", () => {
  render(<AddVehicleModal open={true} onOpenChange={vi.fn()} />);
  expect(screen.getByText("Price")).toBeInTheDocument();
});
```

Note: The loading-skeleton test requires `useDealerships` to be imported and the mock to use `vi.mocked()`. Update the import at the top of the test file:

```tsx
import { useDealerships } from "@/hooks/use-dealerships";
```

The `vi.mock(...)` for `use-dealerships` is already in place. Add `vi.mocked` usage in the new test.

However, since `vi.mock` hoists the module mock but `vi.mocked` needs a typed reference, the simplest approach is to use `mockReturnValueOnce` on the factory. The existing mock factory returns a fixed object — for the loading test, we need to override just that one call.

**Step 2: Run tests to verify they fail**

```bash
cd /Users/admin/Desktop/khanh/workspace/intelligent-inventory-dashboard/frontend
npm test -- --reporter=verbose src/components/__tests__/add-vehicle-modal.test.tsx
```

Expected: new tests fail (component doesn't yet show skeleton, doesn't render status dots, `useDealerships` mock can't be overridden with current approach).

**Step 3: Adjust test approach for the loading skeleton test**

Because the existing `vi.mock` for `use-dealerships` is a module-level mock returning a fixed object, we need to make it a `vi.fn()` so we can override per-test. Update the mock at the top of the test file:

Replace the existing `vi.mock("@/hooks/use-dealerships", ...)` block with a variable-based approach:

```tsx
import { useDealerships } from "@/hooks/use-dealerships";

// … existing mockMutation setup …

vi.mock("@/hooks/use-dealerships");

// In beforeEach, set the default mock return:
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useDealerships).mockReturnValue({
    data: [
      { id: "dealer-001", name: "AutoGroup North" },
      { id: "dealer-002", name: "Central Motors" },
    ],
  } as ReturnType<typeof useDealerships>);
  // … rest of existing beforeEach …
});
```

This enables `mockReturnValueOnce` per-test for the loading skeleton test.

**Step 4: Re-run tests to confirm red**

```bash
cd /Users/admin/Desktop/khanh/workspace/intelligent-inventory-dashboard/frontend
npm test -- --reporter=verbose src/components/__tests__/add-vehicle-modal.test.tsx
```

All existing 11 tests should still pass. New tests should fail (RED).

**Step 5: Commit (test-only commit)**

Stage: `frontend/src/components/__tests__/add-vehicle-modal.test.tsx`
Message: `test(add-vehicle-modal): add failing tests for dealership name, skeleton, and design polish`

---

## Task 2: Fix Dealership Trigger UUID → Name & Loading Skeleton

**Files:**
- Modify: `frontend/src/components/add-vehicle-modal.tsx`

**Security notes:** No new data sources. `dealerships?.find(...)` lookup is pure client-side array lookup on already-fetched API data. No `dangerouslySetInnerHTML`.

**Step 1: Remove `SelectValue` from dealership trigger; render name explicitly**

Locate the dealership `<SelectTrigger>` block (lines 136–138 of current file):

```tsx
// BEFORE
<SelectTrigger id="dealership_id">
  <SelectValue placeholder="Select dealership" />
</SelectTrigger>
```

Replace with:

```tsx
// AFTER
<SelectTrigger id="dealership_id" className="w-full">
  <span className={form.dealership_id ? "" : "text-muted-foreground"}>
    {form.dealership_id
      ? (dealerships?.find((d) => d.id === form.dealership_id)?.name ?? "Select dealership")
      : "Select dealership"}
  </span>
</SelectTrigger>
```

Also remove `SelectValue` from the import (it's still needed for the status trigger — keep it only if status still uses it; in Task 3 we'll also replace the status trigger, so we can remove the import in Task 3 after both replacements).

**Step 2: Wrap dealership select with loading skeleton**

Locate the `<Select>` block for dealership (lines 132–146) and wrap it with a loading skeleton:

```tsx
// BEFORE
<Select
  value={form.dealership_id}
  onValueChange={(v) => handleChange("dealership_id", v ?? "")}
>
  <SelectTrigger id="dealership_id" className="w-full">
    ...
  </SelectTrigger>
  <SelectContent>
    {dealerships?.map((d) => (
      <SelectItem key={d.id} value={d.id}>
        {d.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

// AFTER
{!dealerships ? (
  <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
) : (
  <Select
    value={form.dealership_id}
    onValueChange={(v) => handleChange("dealership_id", v ?? "")}
  >
    <SelectTrigger id="dealership_id" className="w-full">
      <span className={form.dealership_id ? "" : "text-muted-foreground"}>
        {form.dealership_id
          ? (dealerships.find((d) => d.id === form.dealership_id)?.name ?? "Select dealership")
          : "Select dealership"}
      </span>
    </SelectTrigger>
    <SelectContent>
      {dealerships.map((d) => (
        <SelectItem key={d.id} value={d.id}>
          {d.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

**Step 3: Run tests — verify new tests pass and no regressions**

```bash
cd /Users/admin/Desktop/khanh/workspace/intelligent-inventory-dashboard/frontend
npm test -- --reporter=verbose src/components/__tests__/add-vehicle-modal.test.tsx
```

Expected: all 11 original tests pass + new skeleton and placeholder tests pass.

**Step 4: Commit**

Stage: `frontend/src/components/add-vehicle-modal.tsx` + test file (if not yet committed from Task 1)
Message: `fix(add-vehicle-modal): show dealership name in trigger instead of UUID; add loading skeleton`

---

## Task 3: Status Dots, Price Adornment, Section Divider, Error Icon

**Files:**
- Modify: `frontend/src/components/add-vehicle-modal.tsx`

**Security notes:** Purely visual. No data handling changes.

**Step 1: Update Status select items with colored dots**

Locate the status `<SelectContent>` block and replace plain text items with dot-labeled items:

```tsx
// BEFORE
<SelectContent>
  <SelectItem value="available">Available</SelectItem>
  <SelectItem value="sold">Sold</SelectItem>
  <SelectItem value="reserved">Reserved</SelectItem>
</SelectContent>

// AFTER
<SelectContent>
  <SelectItem value="available">
    <span className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
      Available
    </span>
  </SelectItem>
  <SelectItem value="sold">
    <span className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-gray-400" aria-hidden="true" />
      Sold
    </span>
  </SelectItem>
  <SelectItem value="reserved">
    <span className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
      Reserved
    </span>
  </SelectItem>
</SelectContent>
```

**Step 2: Update Status trigger to show dot for selected value**

Define a status config map above the component or inside the function:

```tsx
const STATUS_CONFIG = {
  available: { dot: "bg-green-500", label: "Available" },
  sold: { dot: "bg-gray-400", label: "Sold" },
  reserved: { dot: "bg-amber-400", label: "Reserved" },
} as const;
```

Replace the status `<SelectTrigger>` (currently uses `<SelectValue />`):

```tsx
// BEFORE
<SelectTrigger id="status">
  <SelectValue />
</SelectTrigger>

// AFTER
<SelectTrigger id="status" className="w-full">
  {form.status ? (
    <span className="flex items-center gap-2">
      <span
        className={`h-2 w-2 rounded-full ${STATUS_CONFIG[form.status].dot}`}
        aria-hidden="true"
      />
      {STATUS_CONFIG[form.status].label}
    </span>
  ) : (
    <span className="text-muted-foreground">Select status</span>
  )}
</SelectTrigger>
```

Now `SelectValue` is unused — remove it from the import.

**Step 3: Add `$` prefix adornment to Price field**

Locate the price `<Input>` block and wrap it:

```tsx
// BEFORE
<div>
  <Label htmlFor="price">Price</Label>
  <Input
    id="price"
    type="number"
    min={0}
    max={10000000}
    step="0.01"
    placeholder="Optional"
    value={form.price}
    onChange={(e) => handleChange("price", e.target.value)}
  />
</div>

// AFTER
<div>
  <Label htmlFor="price">Price</Label>
  <div className="relative">
    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
      $
    </span>
    <Input
      id="price"
      type="number"
      min={0}
      max={10000000}
      step="0.01"
      placeholder="Optional"
      className="pl-6"
      value={form.price}
      onChange={(e) => handleChange("price", e.target.value)}
    />
  </div>
</div>
```

**Step 4: Add section divider between VIN and Status+StockedAt**

Locate the VIN `</div>` closing tag (after the VIN field block) and before the Status+StockedAt grid. Insert:

```tsx
{/* Section divider */}
<hr className="border-border" />
```

**Step 5: Add warning icon to field error messages**

Update all `fieldErrors.*` error paragraphs to include the warning icon. There are 5 field error renders (dealership_id, make, model, year, vin). Replace each:

```tsx
// BEFORE (example for make)
{fieldErrors.make && (
  <p className="mt-1 text-sm text-red-500">{fieldErrors.make}</p>
)}

// AFTER
{fieldErrors.make && (
  <p className="mt-1 flex items-center gap-1 text-sm text-red-500">
    <span aria-hidden="true">⚠</span>
    {fieldErrors.make}
  </p>
)}
```

Apply the same change for: `fieldErrors.dealership_id`, `fieldErrors.model`, `fieldErrors.year`, `fieldErrors.vin`.

**Step 6: Tighten overall spacing**

Change the form's `space-y-4` to `space-y-3` for slightly reduced modal height:

```tsx
// BEFORE
<form onSubmit={handleSubmit} className="space-y-4">

// AFTER
<form onSubmit={handleSubmit} className="space-y-3">
```

**Step 7: Run all tests — verify everything passes**

```bash
cd /Users/admin/Desktop/khanh/workspace/intelligent-inventory-dashboard/frontend
npm test -- --reporter=verbose src/components/__tests__/add-vehicle-modal.test.tsx
```

Expected: all tests pass (original 11 + new tests from Task 1).

**Step 8: Run the full frontend test suite to verify no regressions**

```bash
cd /Users/admin/Desktop/khanh/workspace/intelligent-inventory-dashboard/frontend
npm test
```

Expected: all tests pass.

**Step 9: Commit**

Stage: `frontend/src/components/add-vehicle-modal.tsx`
Message: `feat(add-vehicle-modal): status dots, price adornment, section divider, error icons`

---

## Implementation Report Template

Save to: `docs/reports/2026-03-18-add-vehicle-modal-improvement-report.md`

---

## Progress File

Save to: `docs/reports/2026-03-18-add-vehicle-modal-improvement-progress.md`

Template:

```markdown
# Add Vehicle Modal Improvement — Implementation Progress

## Metadata
- **Feature:** Add Vehicle Modal — Dealership Display Fix & Form Design Improvement
- **Plan file:** docs/plans/2026-03-18-add-vehicle-modal-improvement-plan.md
- **Spec file:** docs/specs/2026-03-18-add-vehicle-modal-improvement-spec.md
- **Started:** —
- **Last updated:** —
- **Current state:** not_started
- **Current task:** 1

## Task Progress

| # | Task Name | Status | Commit | Summary |
|---|-----------|--------|--------|---------|
| 1 | Write failing tests for new behavior | pending | — | — |
| 2 | Fix dealership trigger UUID → name + skeleton | pending | — | — |
| 3 | Status dots, price adornment, section divider, error icons | pending | — | — |

## Resume Instructions

1. Read this progress file
2. Read the plan file above
3. `git log --oneline -5` to verify last commit matches last `done` task
4. `git status` for any uncommitted work
5. Continue from the next `pending` task

## Notes

(populated during implementation)
```
