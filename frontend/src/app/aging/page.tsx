export default function AgingStockPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Aging Stock</h1>
        <p className="text-muted-foreground">
          Vehicles in inventory for more than 90 days, sorted by days in stock.
        </p>
      </div>

      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        <p>Aging stock list will be implemented here.</p>
        <p className="text-sm">
          Pre-filtered view with inline action buttons for quick responses.
        </p>
      </div>
    </div>
  );
}
