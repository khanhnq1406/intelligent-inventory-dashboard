import type { components } from "@/lib/api/types";
import { ActionBadge } from "@/components/action-badge";
import { cn } from "@/lib/utils";

type VehicleAction = components["schemas"]["VehicleAction"];

export function ActionTimeline({ actions }: { actions: VehicleAction[] }) {
  if (actions.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-zinc-900">Action History</h3>
        <p className="mt-4 text-sm text-zinc-400">No actions recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h3 className="mb-6 text-lg font-semibold text-zinc-900">Action History</h3>
      <div className="space-y-0">
        {actions.map((action, index) => (
          <div key={action.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Timeline line */}
            {index < actions.length - 1 && (
              <div className="absolute left-[5px] top-3 h-full w-0.5 bg-zinc-200" />
            )}
            {/* Dot */}
            <div
              className={cn(
                "relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full",
                index === 0 ? "bg-blue-600" : "bg-zinc-300"
              )}
            />
            {/* Content */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <ActionBadge actionType={action.action_type} />
                <span className="text-xs text-zinc-400">
                  {new Date(action.created_at).toLocaleDateString()}
                </span>
              </div>
              {action.notes && (
                <p className="mt-1 text-sm text-zinc-600">{action.notes}</p>
              )}
              <p className="mt-1 text-xs text-zinc-400">By: {action.created_by}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
