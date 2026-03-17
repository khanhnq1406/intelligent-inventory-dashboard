package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type mockVehicleRepo struct {
	vehicles []models.Vehicle
	total    int
	vehicle  *models.Vehicle
	listErr  error
	getErr   error
}

func (m *mockVehicleRepo) List(_ context.Context, _ models.VehicleFilters) ([]models.Vehicle, int, error) {
	return m.vehicles, m.total, m.listErr
}

func (m *mockVehicleRepo) GetByID(_ context.Context, _ uuid.UUID) (*models.Vehicle, error) {
	return m.vehicle, m.getErr
}

func TestVehicleService_List(t *testing.T) {
	twoVehicles := []models.Vehicle{
		{ID: uuid.New(), Make: "Honda", DaysInStock: 45, IsAging: false},
		{ID: uuid.New(), Make: "Toyota", DaysInStock: 120, IsAging: true},
	}

	tests := []struct {
		name      string
		repo      *mockVehicleRepo
		filters   models.VehicleFilters
		wantItems int
		wantTotal int
		wantPages int
		wantPage  int
		wantErr   bool
	}{
		{
			name:      "returns paginated vehicles with defaults applied",
			repo:      &mockVehicleRepo{vehicles: twoVehicles, total: 2},
			filters:   models.VehicleFilters{},
			wantItems: 2,
			wantTotal: 2,
			wantPages: 1,
			wantPage:  1,
		},
		{
			name:      "caps page_size to 100",
			repo:      &mockVehicleRepo{vehicles: twoVehicles, total: 2},
			filters:   models.VehicleFilters{PageSize: 500},
			wantItems: 2,
			wantTotal: 2,
			wantPages: 1,
			wantPage:  1,
		},
		{
			name:      "normalizes page_size 0 to default 20",
			repo:      &mockVehicleRepo{vehicles: twoVehicles, total: 50},
			filters:   models.VehicleFilters{PageSize: 0},
			wantItems: 2,
			wantTotal: 50,
			wantPages: 3, // ceil(50/20)
			wantPage:  1,
		},
		{
			name:      "normalizes page 0 to 1",
			repo:      &mockVehicleRepo{vehicles: twoVehicles, total: 2},
			filters:   models.VehicleFilters{Page: 0},
			wantItems: 2,
			wantTotal: 2,
			wantPages: 1,
			wantPage:  1,
		},
		{
			name:      "defaults sort to stocked_at desc",
			repo:      &mockVehicleRepo{vehicles: twoVehicles, total: 2},
			filters:   models.VehicleFilters{SortBy: "", Order: ""},
			wantItems: 2,
			wantTotal: 2,
			wantPages: 1,
			wantPage:  1,
		},
		{
			name:      "invalid sort_by falls back to stocked_at",
			repo:      &mockVehicleRepo{vehicles: twoVehicles, total: 2},
			filters:   models.VehicleFilters{SortBy: "DROP TABLE", Order: "asc"},
			wantItems: 2,
			wantTotal: 2,
			wantPages: 1,
			wantPage:  1,
		},
		{
			name:      "invalid order falls back to desc",
			repo:      &mockVehicleRepo{vehicles: twoVehicles, total: 2},
			filters:   models.VehicleFilters{Order: "sideways"},
			wantItems: 2,
			wantTotal: 2,
			wantPages: 1,
			wantPage:  1,
		},
		{
			name:    "propagates repo error",
			repo:    &mockVehicleRepo{listErr: errors.New("db error")},
			filters: models.VehicleFilters{},
			wantErr: true,
		},
		{
			name:      "empty result set",
			repo:      &mockVehicleRepo{vehicles: []models.Vehicle{}, total: 0},
			filters:   models.VehicleFilters{},
			wantItems: 0,
			wantTotal: 0,
			wantPages: 0,
			wantPage:  1,
		},
		{
			name:      "computes total_pages correctly for partial page",
			repo:      &mockVehicleRepo{vehicles: twoVehicles, total: 21},
			filters:   models.VehicleFilters{PageSize: 20, Page: 1},
			wantItems: 2,
			wantTotal: 21,
			wantPages: 2, // ceil(21/20)
			wantPage:  1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewVehicleService(tt.repo)
			result, err := svc.List(context.Background(), tt.filters)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(result.Items) != tt.wantItems {
				t.Errorf("items: expected %d, got %d", tt.wantItems, len(result.Items))
			}
			if result.Total != tt.wantTotal {
				t.Errorf("total: expected %d, got %d", tt.wantTotal, result.Total)
			}
			if result.TotalPages != tt.wantPages {
				t.Errorf("total_pages: expected %d, got %d", tt.wantPages, result.TotalPages)
			}
			if result.Page != tt.wantPage {
				t.Errorf("page: expected %d, got %d", tt.wantPage, result.Page)
			}
		})
	}
}

func TestVehicleService_GetByID(t *testing.T) {
	vid := uuid.New()
	validVehicle := &models.Vehicle{
		ID: vid, Make: "Honda", Model: "Civic", Year: 2023,
		StockedAt: time.Now().Add(-100 * 24 * time.Hour),
		DaysInStock: 100, IsAging: true,
	}

	tests := []struct {
		name    string
		repo    *mockVehicleRepo
		id      uuid.UUID
		wantNil bool
		wantErr bool
	}{
		{
			name: "returns vehicle",
			repo: &mockVehicleRepo{vehicle: validVehicle},
			id:   vid,
		},
		{
			name:    "returns nil for not found",
			repo:    &mockVehicleRepo{vehicle: nil},
			id:      uuid.New(),
			wantNil: true,
		},
		{
			name:    "propagates repo error",
			repo:    &mockVehicleRepo{getErr: errors.New("db error")},
			id:      uuid.New(),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewVehicleService(tt.repo)
			result, err := svc.GetByID(context.Background(), tt.id)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tt.wantNil {
				if result != nil {
					t.Error("expected nil, got vehicle")
				}
				return
			}
			if result == nil {
				t.Fatal("expected vehicle, got nil")
			}
			if result.ID != vid {
				t.Errorf("expected ID %s, got %s", vid, result.ID)
			}
		})
	}
}
