package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/repository"
)

// CacheInvalidator is called after a write to clear cached dashboard data.
type CacheInvalidator interface {
	Invalidate()
}

var validActionTypes = map[string]bool{
	"price_reduction": true,
	"transfer":        true,
	"auction":         true,
	"marketing":       true,
	"wholesale":       true,
	"custom":          true,
}

type vehicleActionService struct {
	actionRepo  repository.VehicleActionRepository
	vehicleRepo repository.VehicleRepository
	cache       CacheInvalidator
}

func NewVehicleActionService(
	actionRepo repository.VehicleActionRepository,
	vehicleRepo repository.VehicleRepository,
	cache CacheInvalidator,
) VehicleActionService {
	return &vehicleActionService{
		actionRepo:  actionRepo,
		vehicleRepo: vehicleRepo,
		cache:       cache,
	}
}

func (s *vehicleActionService) Create(ctx context.Context, vehicleID uuid.UUID, input models.CreateActionInput) (*models.VehicleAction, error) {
	// Validate input
	if !validActionTypes[input.ActionType] {
		return nil, fmt.Errorf("invalid action_type: %q", input.ActionType)
	}
	input.CreatedBy = strings.TrimSpace(input.CreatedBy)
	if input.CreatedBy == "" {
		return nil, fmt.Errorf("created_by is required")
	}
	if len(input.CreatedBy) > 255 {
		return nil, fmt.Errorf("created_by must be at most 255 characters")
	}
	if len(input.Notes) > 2000 {
		return nil, fmt.Errorf("notes must be at most 2000 characters")
	}

	// Check vehicle exists
	vehicle, err := s.vehicleRepo.GetByID(ctx, vehicleID)
	if err != nil {
		return nil, fmt.Errorf("checking vehicle existence: %w", err)
	}
	if vehicle == nil {
		return nil, fmt.Errorf("vehicle not found: %s", vehicleID)
	}

	// Create action
	action := models.VehicleAction{
		VehicleID:  vehicleID,
		ActionType: input.ActionType,
		Notes:      input.Notes,
		CreatedBy:  input.CreatedBy,
	}
	created, err := s.actionRepo.Create(ctx, action)
	if err != nil {
		return nil, fmt.Errorf("creating vehicle action: %w", err)
	}

	// Invalidate dashboard cache
	s.cache.Invalidate()

	return created, nil
}

func (s *vehicleActionService) ListByVehicleID(ctx context.Context, vehicleID uuid.UUID) ([]models.VehicleAction, error) {
	// Check vehicle exists
	vehicle, err := s.vehicleRepo.GetByID(ctx, vehicleID)
	if err != nil {
		return nil, fmt.Errorf("checking vehicle existence: %w", err)
	}
	if vehicle == nil {
		return nil, fmt.Errorf("vehicle not found: %s", vehicleID)
	}

	actions, err := s.actionRepo.ListByVehicleID(ctx, vehicleID)
	if err != nil {
		return nil, fmt.Errorf("listing vehicle actions: %w", err)
	}
	if actions == nil {
		actions = []models.VehicleAction{}
	}
	return actions, nil
}
