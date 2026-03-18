"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateVehicle } from "@/hooks/use-create-vehicle";
import { useDealerships } from "@/hooks/use-dealerships";
import type { components } from "@/lib/api/types";

type CreateVehicleRequest = components["schemas"]["CreateVehicleRequest"];

interface AddVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const TODAY = new Date().toISOString().split("T")[0];

export function AddVehicleModal({ open, onOpenChange }: AddVehicleModalProps) {
  const { data: dealerships } = useDealerships();
  const { mutate: createVehicle, isPending, error, reset } = useCreateVehicle();

  const [form, setForm] = useState({
    dealership_id: "",
    make: "",
    model: "",
    year: String(CURRENT_YEAR),
    vin: "",
    price: "",
    status: "available" as "available" | "sold" | "reserved",
    stocked_at: TODAY,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleChange(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: field === "vin" ? value.toUpperCase() : value,
    }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!form.dealership_id) errors.dealership_id = "Dealership is required";
    if (!form.make.trim()) errors.make = "Make is required";
    if (!form.model.trim()) errors.model = "Model is required";
    const year = parseInt(form.year);
    if (!year || year < 1900 || year > 2100)
      errors.year = "Year must be 1900–2100";
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(form.vin))
      errors.vin = "VIN must be 17 valid characters";
    if (!form.status) errors.status = "Status is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const body: CreateVehicleRequest = {
      dealership_id: form.dealership_id as `${string}-${string}-${string}-${string}-${string}`,
      make: form.make.trim(),
      model: form.model.trim(),
      year: parseInt(form.year),
      vin: form.vin,
      status: form.status,
    };
    if (form.price) {
      body.price = parseFloat(form.price);
    }
    if (form.stocked_at) {
      body.stocked_at = new Date(form.stocked_at).toISOString();
    }

    createVehicle(body, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
      },
    });
  }

  function resetForm() {
    setForm({
      dealership_id: "",
      make: "",
      model: "",
      year: String(CURRENT_YEAR),
      vin: "",
      price: "",
      status: "available",
      stocked_at: TODAY,
    });
    setFieldErrors({});
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add New Vehicle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dealership */}
          <div>
            <Label htmlFor="dealership_id">Dealership *</Label>
            <Select
              value={form.dealership_id}
              onValueChange={(v) => handleChange("dealership_id", v ?? "")}
            >
              <SelectTrigger id="dealership_id">
                <SelectValue placeholder="Select dealership" />
              </SelectTrigger>
              <SelectContent>
                {dealerships?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.dealership_id && (
              <p className="mt-1 text-sm text-red-500">
                {fieldErrors.dealership_id}
              </p>
            )}
          </div>

          {/* Make + Model */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="make">Make *</Label>
              <Input
                id="make"
                value={form.make}
                onChange={(e) => handleChange("make", e.target.value)}
                maxLength={100}
              />
              {fieldErrors.make && (
                <p className="mt-1 text-sm text-red-500">{fieldErrors.make}</p>
              )}
            </div>
            <div>
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                value={form.model}
                onChange={(e) => handleChange("model", e.target.value)}
                maxLength={100}
              />
              {fieldErrors.model && (
                <p className="mt-1 text-sm text-red-500">{fieldErrors.model}</p>
              )}
            </div>
          </div>

          {/* Year + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Year *</Label>
              <Input
                id="year"
                type="number"
                min={1900}
                max={2100}
                value={form.year}
                onChange={(e) => handleChange("year", e.target.value)}
              />
              {fieldErrors.year && (
                <p className="mt-1 text-sm text-red-500">{fieldErrors.year}</p>
              )}
            </div>
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
          </div>

          {/* VIN */}
          <div>
            <Label htmlFor="vin">VIN *</Label>
            <Input
              id="vin"
              className="font-mono uppercase"
              value={form.vin}
              onChange={(e) => handleChange("vin", e.target.value)}
              maxLength={17}
              placeholder="17-character VIN"
            />
            {fieldErrors.vin && (
              <p className="mt-1 text-sm text-red-500">{fieldErrors.vin}</p>
            )}
          </div>

          {/* Status + Stocked At */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select
                value={form.status}
                onValueChange={(v) => handleChange("status", v ?? "")}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="stocked_at">Stocked At</Label>
              <Input
                id="stocked_at"
                type="date"
                value={form.stocked_at}
                max={TODAY}
                onChange={(e) => handleChange("stocked_at", e.target.value)}
              />
            </div>
          </div>

          {/* Server error */}
          {error && (
            <p className="text-sm text-red-500">{error.message}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isPending}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Adding...
                </span>
              ) : (
                "Add Vehicle"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
