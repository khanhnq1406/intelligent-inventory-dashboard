import { cn } from "@/lib/utils";

const actionConfig: Record<string, { label: string; className: string }> = {
  price_reduction: { label: "Price Reduction", className: "bg-blue-50 text-blue-600" },
  marketing: { label: "Marketing Campaign", className: "bg-amber-50 text-amber-600" },
  transfer: { label: "Transfer", className: "bg-green-50 text-green-600" },
  auction: { label: "Auction", className: "bg-orange-50 text-orange-600" },
  wholesale: { label: "Wholesale", className: "bg-purple-50 text-purple-600" },
  custom: { label: "Custom", className: "bg-zinc-100 text-zinc-600" },
};

export function ActionBadge({ actionType }: { actionType: string }) {
  const config = actionConfig[actionType] ?? { label: actionType, className: "bg-zinc-100 text-zinc-600" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", config.className)}>
      {config.label}
    </span>
  );
}
