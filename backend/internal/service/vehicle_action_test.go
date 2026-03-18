package service

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type mockVehicleActionRepo struct {
	action          *models.VehicleAction
	actions         []models.VehicleAction
	recentActions   []models.RecentAction
	createErr       error
	listErr         error
	listRecentErr   error
	listRecentLimit int // captures the limit passed to ListRecent
}

func (m *mockVehicleActionRepo) Create(_ context.Context, _ models.VehicleAction) (*models.VehicleAction, error) {
	if m.createErr != nil {
		return nil, m.createErr
	}
	return m.action, nil
}

func (m *mockVehicleActionRepo) ListByVehicleID(_ context.Context, _ uuid.UUID) ([]models.VehicleAction, error) {
	return m.actions, m.listErr
}

func (m *mockVehicleActionRepo) ListRecent(_ context.Context, filter models.RecentActionsFilter) ([]models.RecentAction, error) {
	m.listRecentLimit = filter.Limit
	return m.recentActions, m.listRecentErr
}

// mockVehicleRepoForAction implements VehicleRepository for action service tests
type mockVehicleRepoForAction struct {
	vehicle *models.Vehicle
	getErr  error
}

func (m *mockVehicleRepoForAction) List(_ context.Context, _ models.VehicleFilters) ([]models.Vehicle, int, error) {
	return nil, 0, nil
}

func (m *mockVehicleRepoForAction) ListAll(_ context.Context, _ models.VehicleFilters) ([]models.Vehicle, int, error) {
	return nil, 0, nil
}

func (m *mockVehicleRepoForAction) GetByID(_ context.Context, _ uuid.UUID) (*models.Vehicle, error) {
	return m.vehicle, m.getErr
}

func (m *mockVehicleRepoForAction) Create(_ context.Context, _ models.CreateVehicleInput) (*models.Vehicle, error) {
	return nil, nil
}

// mockCacheInvalidator implements CacheInvalidator for action service tests
type mockCacheInvalidator struct {
	called bool
}

func (m *mockCacheInvalidator) Invalidate() {
	m.called = true
}

func TestVehicleActionService_ListRecent(t *testing.T) {
	dealershipID := uuid.MustParse("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")
	actionID := uuid.New()
	vehicleID := uuid.New()

	mockResult := []models.RecentAction{
		{
			ID: actionID, VehicleID: vehicleID,
			VehicleMake: "Toyota", VehicleModel: "Camry", VehicleYear: 2022,
			DaysInStock: 120, ActionType: "price_reduction",
			CreatedBy: "John", CreatedAt: time.Now(),
		},
	}

	tests := []struct {
		name          string
		filter        models.RecentActionsFilter
		repoResult    []models.RecentAction
		repoErr       error
		wantErr       bool
		errContains   string
		wantLen       int
		wantRepoLimit int
	}{
		{
			name:          "returns enriched actions",
			filter:        models.RecentActionsFilter{DealershipID: &dealershipID, Limit: 3},
			repoResult:    mockResult,
			wantLen:       1,
			wantRepoLimit: 3,
		},
		{
			name:        "rejects limit below 1",
			filter:      models.RecentActionsFilter{Limit: 0},
			wantErr:     true,
			errContains: "limit must be between",
		},
		{
			name:        "rejects limit above 50",
			filter:      models.RecentActionsFilter{Limit: 51},
			wantErr:     true,
			errContains: "limit must be between",
		},
		{
			name:          "accepts limit at boundary 1",
			filter:        models.RecentActionsFilter{Limit: 1},
			repoResult:    []models.RecentAction{},
			wantLen:       0,
			wantRepoLimit: 1,
		},
		{
			name:          "accepts limit at boundary 50",
			filter:        models.RecentActionsFilter{Limit: 50},
			repoResult:    []models.RecentAction{},
			wantLen:       0,
			wantRepoLimit: 50,
		},
		{
			name:        "propagates repo error",
			filter:      models.RecentActionsFilter{Limit: 5},
			repoErr:     errors.New("db error"),
			wantErr:     true,
			errContains: "db error",
		},
		{
			name:          "nil dealership_id passes through",
			filter:        models.RecentActionsFilter{Limit: 10},
			repoResult:    mockResult,
			wantLen:       1,
			wantRepoLimit: 10,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &mockVehicleActionRepo{
				recentActions: tt.repoResult,
				listRecentErr: tt.repoErr,
			}
			svc := NewVehicleActionService(repo, &mockVehicleRepoForAction{}, &mockCacheInvalidator{})
			result, err := svc.ListRecent(context.Background(), tt.filter)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				if tt.errContains != "" && !strings.Contains(err.Error(), tt.errContains) {
					t.Errorf("error %q should contain %q", err.Error(), tt.errContains)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(result) != tt.wantLen {
				t.Errorf("expected %d actions, got %d", tt.wantLen, len(result))
			}
			if tt.wantRepoLimit != 0 && repo.listRecentLimit != tt.wantRepoLimit {
				t.Errorf("repo called with limit %d, want %d", repo.listRecentLimit, tt.wantRepoLimit)
			}
		})
	}
}

func TestVehicleActionService_Create(t *testing.T) {
	vid := uuid.New()
	existingVehicle := &models.Vehicle{ID: vid, Make: "Honda"}
	createdAction := &models.VehicleAction{
		ID: uuid.New(), VehicleID: vid, ActionType: "price_reduction",
		CreatedBy: "Manager", CreatedAt: time.Now(),
	}

	tests := []struct {
		name         string
		vehicleRepo  *mockVehicleRepoForAction
		actionRepo   *mockVehicleActionRepo
		cache        *mockCacheInvalidator
		vehicleID    uuid.UUID
		input        models.CreateActionInput
		wantErr      bool
		errContains  string
		cacheInvalid bool
	}{
		{
			name:         "creates action successfully",
			vehicleRepo:  &mockVehicleRepoForAction{vehicle: existingVehicle},
			actionRepo:   &mockVehicleActionRepo{action: createdAction},
			cache:        &mockCacheInvalidator{},
			vehicleID:    vid,
			input:        models.CreateActionInput{ActionType: "price_reduction", CreatedBy: "Manager"},
			cacheInvalid: true,
		},
		{
			name:        "rejects invalid action_type",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: existingVehicle},
			actionRepo:  &mockVehicleActionRepo{action: createdAction},
			cache:       &mockCacheInvalidator{},
			vehicleID:   vid,
			input:       models.CreateActionInput{ActionType: "invalid_type", CreatedBy: "Manager"},
			wantErr:     true,
			errContains: "action_type",
		},
		{
			name:        "rejects empty created_by",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: existingVehicle},
			actionRepo:  &mockVehicleActionRepo{action: createdAction},
			cache:       &mockCacheInvalidator{},
			vehicleID:   vid,
			input:       models.CreateActionInput{ActionType: "price_reduction", CreatedBy: ""},
			wantErr:     true,
			errContains: "created_by",
		},
		{
			name:        "rejects notes over 2000 chars",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: existingVehicle},
			actionRepo:  &mockVehicleActionRepo{action: createdAction},
			cache:       &mockCacheInvalidator{},
			vehicleID:   vid,
			input:       models.CreateActionInput{ActionType: "price_reduction", CreatedBy: "Manager", Notes: string(make([]byte, 2001))},
			wantErr:     true,
			errContains: "notes",
		},
		{
			name:         "accepts notes at exactly 2000 chars",
			vehicleRepo:  &mockVehicleRepoForAction{vehicle: existingVehicle},
			actionRepo:   &mockVehicleActionRepo{action: createdAction},
			cache:        &mockCacheInvalidator{},
			vehicleID:    vid,
			input:        models.CreateActionInput{ActionType: "price_reduction", CreatedBy: "Manager", Notes: string(make([]byte, 2000))},
			cacheInvalid: true,
		},
		{
			name:        "rejects created_by over 255 chars",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: existingVehicle},
			actionRepo:  &mockVehicleActionRepo{action: createdAction},
			cache:       &mockCacheInvalidator{},
			vehicleID:   vid,
			input:       models.CreateActionInput{ActionType: "price_reduction", CreatedBy: string(make([]byte, 256))},
			wantErr:     true,
			errContains: "created_by",
		},
		{
			name:        "returns error when vehicle not found",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: nil},
			actionRepo:  &mockVehicleActionRepo{action: createdAction},
			cache:       &mockCacheInvalidator{},
			vehicleID:   uuid.New(),
			input:       models.CreateActionInput{ActionType: "price_reduction", CreatedBy: "Manager"},
			wantErr:     true,
			errContains: "not found",
		},
		{
			name:        "propagates repo error on vehicle check",
			vehicleRepo: &mockVehicleRepoForAction{getErr: errors.New("db error")},
			actionRepo:  &mockVehicleActionRepo{action: createdAction},
			cache:       &mockCacheInvalidator{},
			vehicleID:   vid,
			input:       models.CreateActionInput{ActionType: "price_reduction", CreatedBy: "Manager"},
			wantErr:     true,
		},
		{
			name:        "propagates repo error on action create",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: existingVehicle},
			actionRepo:  &mockVehicleActionRepo{createErr: errors.New("insert error")},
			cache:       &mockCacheInvalidator{},
			vehicleID:   vid,
			input:       models.CreateActionInput{ActionType: "price_reduction", CreatedBy: "Manager"},
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewVehicleActionService(tt.actionRepo, tt.vehicleRepo, tt.cache)
			result, err := svc.Create(context.Background(), tt.vehicleID, tt.input)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				if tt.errContains != "" && !strings.Contains(err.Error(), tt.errContains) {
					t.Errorf("error %q should contain %q", err.Error(), tt.errContains)
				}
				if tt.cache.called {
					t.Error("cache should not be invalidated on error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result == nil {
				t.Fatal("expected action, got nil")
			}
			if tt.cacheInvalid && !tt.cache.called {
				t.Error("expected cache to be invalidated")
			}
		})
	}
}

func TestVehicleActionService_ListByVehicleID(t *testing.T) {
	vid := uuid.New()
	actions := []models.VehicleAction{
		{ID: uuid.New(), VehicleID: vid, ActionType: "price_reduction"},
	}

	tests := []struct {
		name        string
		vehicleRepo *mockVehicleRepoForAction
		actionRepo  *mockVehicleActionRepo
		vehicleID   uuid.UUID
		wantCount   int
		wantErr     bool
		errContains string
	}{
		{
			name:        "returns actions",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: &models.Vehicle{ID: vid}},
			actionRepo:  &mockVehicleActionRepo{actions: actions},
			vehicleID:   vid,
			wantCount:   1,
		},
		{
			name:        "returns empty list for vehicle with no actions",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: &models.Vehicle{ID: vid}},
			actionRepo:  &mockVehicleActionRepo{actions: []models.VehicleAction{}},
			vehicleID:   vid,
			wantCount:   0,
		},
		{
			name:        "returns error when vehicle not found",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: nil},
			actionRepo:  &mockVehicleActionRepo{},
			vehicleID:   uuid.New(),
			wantErr:     true,
			errContains: "not found",
		},
		{
			name:        "propagates repo error",
			vehicleRepo: &mockVehicleRepoForAction{vehicle: &models.Vehicle{ID: vid}},
			actionRepo:  &mockVehicleActionRepo{listErr: errors.New("db error")},
			vehicleID:   vid,
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewVehicleActionService(tt.actionRepo, tt.vehicleRepo, &mockCacheInvalidator{})
			result, err := svc.ListByVehicleID(context.Background(), tt.vehicleID)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				if tt.errContains != "" && !strings.Contains(err.Error(), tt.errContains) {
					t.Errorf("error %q should contain %q", err.Error(), tt.errContains)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(result) != tt.wantCount {
				t.Errorf("expected %d actions, got %d", tt.wantCount, len(result))
			}
		})
	}
}
