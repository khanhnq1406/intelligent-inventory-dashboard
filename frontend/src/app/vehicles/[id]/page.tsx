export default function VehicleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vehicle Detail</h1>
        <p className="text-muted-foreground">Vehicle ID: {params.id}</p>
      </div>

      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        <p>Vehicle detail card with action history will be implemented here.</p>
        <p className="text-sm">
          Full vehicle info, action timeline, and new action form.
        </p>
      </div>
    </div>
  );
}
