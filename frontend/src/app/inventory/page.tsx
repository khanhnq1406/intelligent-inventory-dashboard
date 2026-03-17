export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vehicle Inventory</h1>
        <p className="text-muted-foreground">
          Filterable, sortable, and paginated view of all vehicles.
        </p>
      </div>

      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        <p>Vehicle inventory table will be implemented here.</p>
        <p className="text-sm">
          Filters: make, model, status, aging toggle | Sortable columns |
          Pagination
        </p>
      </div>
    </div>
  );
}
