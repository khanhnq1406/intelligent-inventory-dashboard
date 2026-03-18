package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

// ErrDuplicateVIN is returned when an INSERT violates the vehicles.vin UNIQUE constraint.
var ErrDuplicateVIN = errors.New("duplicate VIN")

type HealthRepository interface {
	Ping(ctx context.Context) error
}

type DealershipRepository interface {
	List(ctx context.Context) ([]models.Dealership, error)
	GetByID(ctx context.Context, id uuid.UUID) (*models.Dealership, error)
}

type VehicleRepository interface {
	List(ctx context.Context, filters models.VehicleFilters) ([]models.Vehicle, int, error)
	ListAll(ctx context.Context, filters models.VehicleFilters) ([]models.Vehicle, int, error)
	GetByID(ctx context.Context, id uuid.UUID) (*models.Vehicle, error)
	Create(ctx context.Context, input models.CreateVehicleInput) (*models.Vehicle, error)
}

type VehicleActionRepository interface {
	Create(ctx context.Context, action models.VehicleAction) (*models.VehicleAction, error)
	ListByVehicleID(ctx context.Context, vehicleID uuid.UUID) ([]models.VehicleAction, error)
	ListRecent(ctx context.Context, filter models.RecentActionsFilter) ([]models.RecentAction, error)
}

type DashboardRepository interface {
	GetSummary(ctx context.Context) (*models.DashboardSummary, error)
}
