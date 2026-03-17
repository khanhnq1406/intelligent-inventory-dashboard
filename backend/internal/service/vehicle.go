package service

import (
	"context"
	"fmt"
	"math"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/repository"
)

// validSortColumns whitelists allowed sort values.
var validSortColumns = map[string]bool{
	"stocked_at": true,
	"price":      true,
	"year":       true,
	"make":       true,
}

type vehicleService struct {
	repo repository.VehicleRepository
}

func NewVehicleService(repo repository.VehicleRepository) VehicleService {
	return &vehicleService{repo: repo}
}

func (s *vehicleService) List(ctx context.Context, filters models.VehicleFilters) (*models.PaginatedVehicles, error) {
	// Normalize filters
	if filters.Page < 1 {
		filters.Page = 1
	}
	if filters.PageSize < 1 {
		filters.PageSize = 20
	}
	if filters.PageSize > 100 {
		filters.PageSize = 100
	}
	if !validSortColumns[filters.SortBy] {
		filters.SortBy = "stocked_at"
	}
	if filters.Order != "asc" && filters.Order != "desc" {
		filters.Order = "desc"
	}

	vehicles, total, err := s.repo.List(ctx, filters)
	if err != nil {
		return nil, fmt.Errorf("listing vehicles: %w", err)
	}

	if vehicles == nil {
		vehicles = []models.Vehicle{}
	}

	totalPages := 0
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(filters.PageSize)))
	}

	return &models.PaginatedVehicles{
		Items:      vehicles,
		Total:      total,
		Page:       filters.Page,
		PageSize:   filters.PageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *vehicleService) GetByID(ctx context.Context, id uuid.UUID) (*models.Vehicle, error) {
	vehicle, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("getting vehicle by id: %w", err)
	}
	return vehicle, nil
}
