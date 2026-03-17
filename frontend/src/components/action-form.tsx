"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useCreateVehicleAction } from "@/hooks/use-create-vehicle-action";
import type { components } from "@/lib/api/types";

type ActionType = components["schemas"]["CreateVehicleActionRequest"]["action_type"];

const actionTypes: { value: ActionType; label: string }[] = [
  { value: "price_reduction", label: "Price Reduction" },
  { value: "marketing", label: "Marketing Campaign" },
  { value: "transfer", label: "Transfer" },
  { value: "auction", label: "Auction" },
  { value: "wholesale", label: "Wholesale" },
  { value: "custom", label: "Custom" },
];

export function ActionForm({ vehicleId }: { vehicleId: string }) {
  const [actionType, setActionType] = useState<ActionType | "">("");
  const [notes, setNotes] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const mutation = useCreateVehicleAction(vehicleId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionType || !createdBy) return;

    mutation.mutate(
      {
        action_type: actionType,
        notes: notes || undefined,
        created_by: createdBy,
      },
      {
        onSuccess: () => {
          setActionType("");
          setNotes("");
          setCreatedBy("");
        },
      }
    );
  };

  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white p-6 lg:w-[380px]">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900">Log New Action</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Action Type */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Action Type</label>
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value as ActionType)}
            required
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select action type...</option>
            {actionTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this action..."
            rows={4}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Your Name */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Your Name</label>
          <input
            type="text"
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
            required
            placeholder="Enter your name"
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={mutation.isPending || !actionType || !createdBy}
          className="w-full bg-blue-600 text-white hover:bg-blue-700"
        >
          <Send className="h-4 w-4" />
          {mutation.isPending ? "Submitting..." : "Log Action"}
        </Button>

        {mutation.isError && (
          <p className="text-sm text-red-600">Failed to log action. Please try again.</p>
        )}
        {mutation.isSuccess && (
          <p className="text-sm text-green-600">Action logged successfully!</p>
        )}
      </form>

      {/* Available action types */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {actionTypes.map((t) => (
          <span key={t.value} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
