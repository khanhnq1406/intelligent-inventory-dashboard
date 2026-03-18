# Add Vehicle Modal — Dealership Display Fix & Form Design Improvement Spec

## Summary

The "Add New Vehicle" modal has two issues: (1) after selecting a dealership, the trigger shows the UUID instead of the dealership name — a `@base-ui/react/select` rendering quirk where `SelectValue` falls back to the raw `value` string when it cannot find the registered `ItemText`; (2) the form layout and visual design can be improved for clarity, scannability, and a more polished dealership-management feel.

This spec covers the bug fix for the UUID display and a design refresh of the modal form — no API, schema, or OpenAPI changes required.

---

## User Stories

- As a dealership manager, I want to see the dealership **name** (not UUID) after selecting from the dropdown, so I can confirm my selection at a glance.
- As a dealership manager, I want the "Add Vehicle" form to feel polished and easy to scan, so I can fill it out quickly without confusion.

---

## Functional Requirements

### FR-1: Dealership Select Shows Name in Trigger

After the user selects a dealership from the dropdown, the `SelectTrigger` must display the **dealership name** (e.g. "AutoGroup North"), never the UUID.

**Acceptance criteria:**
- [ ] Selecting a dealership shows its name in the closed trigger
- [ ] Placeholder "Select dealership" shows when nothing is selected
- [ ] The submitted `dealership_id` value is still the UUID (no change to API payload)
- [ ] Loading state shown while dealerships are fetching
- [ ] Error/empty state handled gracefully

**Root cause:** `@base-ui/react/select`'s `SelectValue` renders the raw `value` string when it cannot resolve the `ItemText` from registered items. The fix is to render the selected name explicitly by looking it up from the dealerships array, bypassing `SelectValue`'s internal item text resolution:

```tsx
// Instead of relying on SelectValue's automatic item-text lookup:
<SelectValue placeholder="Select dealership" />

// Render the matched name explicitly:
<SelectTrigger id="dealership_id">
  {form.dealership_id
    ? dealerships?.find((d) => d.id === form.dealership_id)?.name ?? form.dealership_id
    : <span className="text-muted-foreground">Select dealership</span>
  }
  {/* chevron icon rendered by SelectTrigger internally */}
</SelectTrigger>
```

This is a pure frontend fix — no children prop change needed because `SelectTrigger` in the existing wrapper already appends the chevron icon separately.

### FR-2: Improved Form Layout & Visual Design

Redesign the modal form for better visual hierarchy, spacing, and usability.

**Design goals:**
- Clear section grouping (vehicle identity vs. logistics)
- Better field widths — VIN should span full width; Year + Price 2-col is fine
- Loading skeleton for the dealership dropdown while fetching
- Subtle section divider between "Vehicle Info" and "Logistics"
- Required field indicator (`*`) styled consistently
- Error messages more prominent (red-500 is fine, add an icon)
- Stocked At date input styled consistently with other inputs (native date picker is fine)
- Status select: show colored dot badge for each status option (Available = green, Sold = gray, Reserved = amber)
- Price: add a `$` prefix adornment inside the input
- Overall padding/spacing tightened to reduce modal height

**Acceptance criteria:**
- [ ] Modal max-width stays at 560px
- [ ] Dealership has loading skeleton while `useDealerships` is pending
- [ ] Status options show colored dot indicators
- [ ] Price field has `$` prefix adornment
- [ ] All validation errors still display correctly
- [ ] All existing tests still pass

---

## Non-Functional Requirements

- **No regression:** All 11 existing tests in `add-vehicle-modal.test.tsx` must continue to pass
- **No API changes:** Zero changes to OpenAPI spec, backend, or generated types
- **Performance:** No new dependencies; use existing shadcn/ui primitives and Tailwind only
- **Accessibility:** Color alone must not convey status — use text labels alongside dots

---

## Architecture Changes (C4)

No architecture changes. This is a pure frontend component fix. No new components, no new layers, no new API endpoints. The system design doc does not need updating.

---

## Runtime Flow Diagrams

No new flow diagrams needed. The fix is entirely in rendering logic — no new async flows or business logic steps.

---

## Data Model Changes

None.

---

## API Changes

None. The `dealership_id` UUID is still submitted as the payload value.

---

## UI/UX Changes

### Existing Component Inventory

| Need | Existing Component | Location |
|------|--------------------|----------|
| Modal wrapper | `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` | `components/ui/dialog.tsx` |
| Dropdown select | `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` | `components/ui/select.tsx` |
| Text / number input | `Input` | `components/ui/input.tsx` |
| Field label | `Label` | `components/ui/label.tsx` |
| Buttons | `Button` | `components/ui/button.tsx` |
| Status dot | Inline `<span>` with `className` color — no separate component needed | inline |

### New Components

None — all changes are inline within `add-vehicle-modal.tsx` using existing primitives.

### Detailed Design Changes

**1. Dealership trigger — fix UUID display**

Replace `<SelectValue placeholder="Select dealership" />` inside the `SelectTrigger` with a conditional that renders the matched name explicitly:

```tsx
<SelectTrigger id="dealership_id" className="w-full">
  <span className={form.dealership_id ? "" : "text-muted-foreground"}>
    {form.dealership_id
      ? (dealerships?.find((d) => d.id === form.dealership_id)?.name ?? "Select dealership")
      : "Select dealership"}
  </span>
</SelectTrigger>
```

**2. Dealership loading skeleton**

While `useDealerships` is loading (`!dealerships`), show a pulsing skeleton placeholder:

```tsx
{!dealerships ? (
  <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
) : (
  <Select ...>...</Select>
)}
```

**3. Status options with colored dots**

```tsx
<SelectItem value="available">
  <span className="flex items-center gap-2">
    <span className="h-2 w-2 rounded-full bg-green-500" />
    Available
  </span>
</SelectItem>
<SelectItem value="sold">
  <span className="flex items-center gap-2">
    <span className="h-2 w-2 rounded-full bg-gray-400" />
    Sold
  </span>
</SelectItem>
<SelectItem value="reserved">
  <span className="flex items-center gap-2">
    <span className="h-2 w-2 rounded-full bg-amber-400" />
    Reserved
  </span>
</SelectItem>
```

The Status trigger also shows the dot for the currently selected value by looking it up similarly to the dealership fix.

**4. Price field with `$` adornment**

Wrap price input in a relative container:

```tsx
<div className="relative">
  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
  <Input id="price" type="number" className="pl-6" ... />
</div>
```

**5. Section divider**

Add a subtle `<hr className="border-border" />` between the VIN row and the Status+StockedAt row to visually separate "vehicle identity" from "logistics/status" fields.

**6. Error messages with icon**

```tsx
{fieldErrors.make && (
  <p className="mt-1 flex items-center gap-1 text-sm text-red-500">
    <span aria-hidden="true">⚠</span>
    {fieldErrors.make}
  </p>
)}
```

---

## Security & Risk Assessment

### Data Flow Diagram

| # | Source | Data | Trust Boundary Crossed? | Destination | Notes |
|---|--------|------|------------------------|-------------|-------|
| 1 | Browser form | `dealership_id` (UUID), make, model, year, VIN, price, status, stocked_at | Yes: Browser → API | `POST /api/v1/vehicles` | Server-side validation already in place |
| 2 | `GET /api/v1/dealerships` | Dealership list (id + name) | Yes: API → Browser | Rendered in dropdown | Read-only; no sensitive data |

### Threats Identified

| # | STRIDE | Threat | Severity | Mitigation |
|---|--------|--------|----------|------------|
| T-1 | Tampering | Client manipulates `dealership_id` to a UUID it doesn't own | Low | Server-side ownership check (already implemented in backend service) |
| T-2 | Information Disclosure | Dealership names exposed to any user who opens the form | Low | Dealerships are not sensitive PII; already served by existing endpoint |

No new threats introduced. This is a display-only fix + styling change.

### Authorization Rules

No change — the backend already validates `dealership_id` belongs to the authenticated context.

### Input Validation Rules

No change to validation logic. The `validate()` function in the component is unchanged.

### Sensitive Data Handling

No sensitive data involved in this change.

### Issues & Risks Summary

1. **SelectValue replacement** — The fix bypasses `SelectValue` entirely for the dealership trigger. This is safe because we render the name directly from the `dealerships` array. Risk: if `dealerships` is undefined (loading), we show the placeholder. Mitigation: loading skeleton shown while fetching.
2. **Test mock compatibility** — The existing tests mock `@/hooks/use-dealerships` with `data: [{id: "dealer-001", name: "AutoGroup North"}, ...]`. The new rendering logic uses `dealerships?.find(...)`, which works correctly with the mock. Existing tests will pass without changes.
3. **No SelectValue for dealership** — Removing `<SelectValue>` from the dealership trigger means `base-ui` won't manage "placeholder" data-attribute on the trigger for CSS. The placeholder text is now rendered as a `<span>` — we manually apply `text-muted-foreground` styling. This is visually equivalent.

---

## Edge Cases & Error Handling

| Scenario | Behavior |
|----------|----------|
| Dealerships still loading | Show skeleton; select is hidden |
| Dealerships fetch fails | Show empty select with placeholder; user sees "Dealership is required" on submit |
| Only 1 dealership | Auto-select it (out of scope — keep current behavior, no auto-select) |
| Dealership list changes after selection | Selected name from `find()` will update if `dealerships` re-fetches |

---

## Dependencies & Assumptions

- `@base-ui/react/select` is the underlying primitive — no upgrade or swap needed
- `useDealerships` returns `{ data: Dealership[] | undefined, isLoading: boolean }`
- No new npm packages required

---

## Out of Scope

- Auto-selecting a dealership when there is only one
- Searchable/combobox dealership dropdown (would require replacing Select with Combobox)
- Multi-step form / wizard
- Any backend changes
- Any OpenAPI changes
