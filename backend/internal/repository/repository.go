package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type HealthRepository interface {
	Ping(ctx context.Context) error
}

type DealershipRepository interface {
	List(ctx context.Context) ([]models.Dealership, error)
}

type VehicleRepository interface {
	List(ctx context.Context, filters models.VehicleFilters) ([]models.Vehicle, int, error)
	GetByID(ctx context.Context, id uuid.UUID) (*models.Vehicle, error)
}

type VehicleActionRepository interface {
	Create(ctx context.Context, action models.VehicleAction) (*models.VehicleAction, error)
	ListByVehicleID(ctx context.Context, vehicleID uuid.UUID) ([]models.VehicleAction, error)
}

type DashboardRepository interface {
	GetSummary(ctx context.Context) (*models.DashboardSummary, error)
}
