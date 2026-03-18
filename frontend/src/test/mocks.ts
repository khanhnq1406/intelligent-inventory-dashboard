import type { components } from "@/lib/api/types";

type Vehicle = components["schemas"]["Vehicle"];
type VehicleAction = components["schemas"]["VehicleAction"];
type DashboardSummary = components["schemas"]["DashboardSummary"];
type PaginatedVehicles = components["schemas"]["PaginatedVehicles"];

export const mockAction: VehicleAction = {
  id: "action-001",
  vehicle_id: "vehicle-001",
  action_type: "price_reduction",
  notes: "Reduced by $500",
  created_by: "Test User",
  created_at: "2026-01-15T10:00:00Z",
};

export const mockVehicle: Vehicle = {
  id: "vehicle-001",
  dealership_id: "test-dealer-001",
  make: "Toyota",
  model: "Camry",
  year: 2024,
  vin: "TEST-VIN-12345678",
  price: 30000,
  status: "available",
  stocked_at: "2025-12-01T00:00:00Z",
  days_in_stock: 106,
  is_aging: true,
  created_at: "2025-12-01T00:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
  actions: [mockAction],
};

export const mockVehicleNonAging: Vehicle = {
  id: "vehicle-002",
  dealership_id: "test-dealer-001",
  make: "Honda",
  model: "Civic",
  year: 2025,
  vin: "TEST-VIN-87654321",
  price: 25000,
  status: "available",
  stocked_at: "2026-02-01T00:00:00Z",
  days_in_stock: 44,
  is_aging: false,
  created_at: "2026-02-01T00:00:00Z",
  updated_at: "2026-02-01T00:00:00Z",
  actions: [],
};

export const mockPaginatedVehicles: PaginatedVehicles = {
  items: [mockVehicle, mockVehicleNonAging],
  total: 2,
  page: 1,
  page_size: 20,
  total_pages: 1,
};

export const mockDashboardSummary: DashboardSummary = {
  total_vehicles: 150,
  aging_vehicles: 12,
  average_days_in_stock: 45,
  actions_this_month: 8,
  by_make: [
    { make: "Toyota", count: 50, aging_count: 5 },
    { make: "Honda", count: 30, aging_count: 3 },
  ],
  by_status: [
    { status: "available", count: 100 },
    { status: "sold", count: 40 },
    { status: "reserved", count: 10 },
  ],
};
