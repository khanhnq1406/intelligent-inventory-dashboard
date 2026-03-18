package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type HealthService interface {
	Check(ctx context.Context) (*models.HealthStatus, error)
}

type DealershipService interface {
	List(ctx context.Context) ([]models.Dealership, error)
}

type VehicleService interface {
	List(ctx context.Context, filters models.VehicleFilters) (*models.PaginatedVehicles, error)
	GetByID(ctx context.Context, id uuid.UUID) (*models.Vehicle, error)
	Create(ctx context.Context, input models.CreateVehicleInput) (*models.Vehicle, error)
	ExportCSV(ctx context.Context, filters models.VehicleFilters) ([]byte, error)
}

type VehicleActionService interface {
	Create(ctx context.Context, vehicleID uuid.UUID, input models.CreateActionInput) (*models.VehicleAction, error)
	ListByVehicleID(ctx context.Context, vehicleID uuid.UUID) ([]models.VehicleAction, error)
	ListRecent(ctx context.Context, filter models.RecentActionsFilter) ([]models.RecentAction, error)
}

type DashboardService interface {
	GetSummary(ctx context.Context) (*models.DashboardSummary, error)
}
