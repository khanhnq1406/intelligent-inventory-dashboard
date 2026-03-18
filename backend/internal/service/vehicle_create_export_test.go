package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/repository"
)

// mockVehicleRepoWithCreate extends mockVehicleRepo with configurable Create behavior.
type mockVehicleRepoWithCreate struct {
	mockVehicleRepo
	createVehicle *models.Vehicle
	createErr     error
}

func (m *mockVehicleRepoWithCreate) Create(_ context.Context, _ models.CreateVehicleInput) (*models.Vehicle, error) {
	return m.createVehicle, m.createErr
}

func validCreateInput() models.CreateVehicleInput {
	return models.CreateVehicleInput{
		DealershipID: uuid.New(),
		Make:         "Honda",
		Model:        "Civic",
		Year:         2023,
		VIN:          "1HGBH41JXMN109186",
		Status:       "available",
	}
}

func TestVehicleService_Create_Validation(t *testing.T) {
	validDealership := &models.Dealership{ID: uuid.New(), Name: "Test Dealer"}

	tests := []struct {
		name    string
		input   models.CreateVehicleInput
		wantErr string
	}{
		{
			name:    "valid input succeeds",
			input:   validCreateInput(),
			wantErr: "",
		},
		{
			name:    "empty make rejected",
			input:   func() models.CreateVehicleInput { i := validCreateInput(); i.Make = ""; return i }(),
			wantErr: "make must be 1-100 characters",
		},
		{
			name:    "make too long rejected",
			input:   func() models.CreateVehicleInput { i := validCreateInput(); i.Make = strings.Repeat("A", 101); return i }(),
			wantErr: "make must be 1-100 characters",
		},
		{
			name:    "empty model rejected",
			input:   func() models.CreateVehicleInput { i := validCreateInput(); i.Model = ""; return i }(),
			wantErr: "model must be 1-100 characters",
		},
		{
			name:    "year below 1900 rejected",
			input:   func() models.CreateVehicleInput { i := validCreateInput(); i.Year = 1899; return i }(),
			wantErr: "year must be between 1900 and 2100",
		},
		{
			name:    "year above 2100 rejected",
			input:   func() models.CreateVehicleInput { i := validCreateInput(); i.Year = 2101; return i }(),
			wantErr: "year must be between 1900 and 2100",
		},
		{
			name:    "invalid VIN rejected",
			input:   func() models.CreateVehicleInput { i := validCreateInput(); i.VIN = "TOOSHORT"; return i }(),
			wantErr: "VIN must be exactly 17",
		},
		{
			name:    "VIN with invalid char I rejected",
			input:   func() models.CreateVehicleInput { i := validCreateInput(); i.VIN = "1HGBH41JXMN10IIII"; return i }(),
			wantErr: "VIN must be exactly 17",
		},
		{
			name:    "negative price rejected",
			input:   func() models.CreateVehicleInput { i := validCreateInput(); p := -1.0; i.Price = &p; return i }(),
			wantErr: "price cannot be negative",
		},
		{
			name:    "price exceeding 10M rejected",
			input:   func() models.CreateVehicleInput { i := validCreateInput(); p := 10_000_001.0; i.Price = &p; return i }(),
			wantErr: "price cannot exceed 10,000,000",
		},
		{
			name:    "invalid status rejected",
			input:   func() models.CreateVehicleInput { i := validCreateInput(); i.Status = "unknown"; return i }(),
			wantErr: "status must be available, sold, or reserved",
		},
		{
			name: "future stocked_at rejected",
			input: func() models.CreateVehicleInput {
				i := validCreateInput()
				i.StockedAt = time.Now().Add(24 * time.Hour)
				return i
			}(),
			wantErr: "stocked date cannot be in the future",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			created := &models.Vehicle{ID: uuid.New(), Make: tt.input.Make, Model: tt.input.Model}
			repo := &mockVehicleRepoWithCreate{createVehicle: created}
			cache := &mockCacheInvalidator{}
			dealerRepo := &mockDealershipRepoForVehicle{dealership: validDealership}
			svc := NewVehicleService(repo, dealerRepo, cache)

			_, err := svc.Create(context.Background(), tt.input)
			if tt.wantErr == "" {
				if err != nil {
					t.Errorf("expected no error, got: %v", err)
				}
				return
			}
			if err == nil {
				t.Fatalf("expected error containing %q, got nil", tt.wantErr)
			}
			if !strings.Contains(err.Error(), tt.wantErr) {
				t.Errorf("expected error to contain %q, got: %v", tt.wantErr, err)
			}
		})
	}
}

func TestVehicleService_Create_DealershipCheck(t *testing.T) {
	tests := []struct {
		name       string
		dealership *models.Dealership
		dealerErr  error
		wantErr    string
	}{
		{
			name:       "dealership not found returns error",
			dealership: nil,
			wantErr:    "dealership not found",
		},
		{
			name:      "dealership repo error propagated",
			dealerErr: errors.New("db timeout"),
			wantErr:   "checking dealership",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &mockVehicleRepoWithCreate{}
			cache := &mockCacheInvalidator{}
			dealerRepo := &mockDealershipRepoForVehicle{dealership: tt.dealership, getErr: tt.dealerErr}
			svc := NewVehicleService(repo, dealerRepo, cache)

			_, err := svc.Create(context.Background(), validCreateInput())
			if err == nil {
				t.Fatal("expected error, got nil")
			}
			if !strings.Contains(err.Error(), tt.wantErr) {
				t.Errorf("expected error to contain %q, got: %v", tt.wantErr, err)
			}
		})
	}
}

func TestVehicleService_Create_DuplicateVIN(t *testing.T) {
	validDealership := &models.Dealership{ID: uuid.New(), Name: "Test Dealer"}
	repo := &mockVehicleRepoWithCreate{createErr: repository.ErrDuplicateVIN}
	cache := &mockCacheInvalidator{}
	dealerRepo := &mockDealershipRepoForVehicle{dealership: validDealership}
	svc := NewVehicleService(repo, dealerRepo, cache)

	_, err := svc.Create(context.Background(), validCreateInput())
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, repository.ErrDuplicateVIN) {
		t.Errorf("expected ErrDuplicateVIN sentinel, got: %v", err)
	}
}

func TestVehicleService_Create_CacheInvalidated(t *testing.T) {
	validDealership := &models.Dealership{ID: uuid.New(), Name: "Test Dealer"}
	created := &models.Vehicle{ID: uuid.New()}
	repo := &mockVehicleRepoWithCreate{createVehicle: created}
	cache := &mockCacheInvalidator{}
	dealerRepo := &mockDealershipRepoForVehicle{dealership: validDealership}
	svc := NewVehicleService(repo, dealerRepo, cache)

	_, err := svc.Create(context.Background(), validCreateInput())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !cache.called {
		t.Error("expected cache.Invalidate() to be called after successful create")
	}
}

func TestVehicleService_ExportCSV(t *testing.T) {
	now := time.Now().UTC()
	price := 25000.0
	vehicles := []models.Vehicle{
		{
			ID:          uuid.New(),
			VIN:         "1HGBH41JXMN109186",
			Make:        "Honda",
			Model:       "Civic",
			Year:        2023,
			Price:       &price,
			Status:      "available",
			StockedAt:   now.Add(-30 * 24 * time.Hour),
			DaysInStock: 30,
			IsAging:     false,
			CreatedAt:   now.Add(-30 * 24 * time.Hour),
		},
		{
			ID:          uuid.New(),
			VIN:         "2T1BURHE0JC060001",
			Make:        "Toyota",
			Model:       "Corolla",
			Year:        2022,
			Price:       nil,
			Status:      "sold",
			StockedAt:   now.Add(-120 * 24 * time.Hour),
			DaysInStock: 120,
			IsAging:     true,
			CreatedAt:   now.Add(-120 * 24 * time.Hour),
		},
	}

	tests := []struct {
		name         string
		repo         *mockVehicleRepo
		filters      models.VehicleFilters
		wantErr      string
		checkRecords int
	}{
		{
			name:         "returns valid CSV with header and data rows",
			repo:         &mockVehicleRepo{vehicles: vehicles, total: 2},
			filters:      models.VehicleFilters{},
			checkRecords: 2,
		},
		{
			name:    "exceeds 10000 row limit returns error",
			repo:    &mockVehicleRepo{vehicles: []models.Vehicle{}, total: 10_001},
			filters: models.VehicleFilters{},
			wantErr: "export exceeds",
		},
		{
			name:    "repo error propagated",
			repo:    &mockVehicleRepo{listErr: errors.New("db timeout")},
			filters: models.VehicleFilters{},
			wantErr: "fetching vehicles",
		},
		{
			name:         "empty result returns header only",
			repo:         &mockVehicleRepo{vehicles: []models.Vehicle{}, total: 0},
			filters:      models.VehicleFilters{},
			checkRecords: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewVehicleService(tt.repo, &mockDealershipRepoForVehicle{}, &mockCacheInvalidator{})
			data, err := svc.ExportCSV(context.Background(), tt.filters)

			if tt.wantErr != "" {
				if err == nil {
					t.Fatalf("expected error containing %q, got nil", tt.wantErr)
				}
				if !strings.Contains(err.Error(), tt.wantErr) {
					t.Errorf("expected error to contain %q, got: %v", tt.wantErr, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if data == nil {
				t.Fatal("expected CSV bytes, got nil")
			}

			r := csv.NewReader(bytes.NewReader(data))
			records, err := r.ReadAll()
			if err != nil {
				t.Fatalf("failed to parse CSV output: %v", err)
			}

			// Header row + data rows
			expectedRows := tt.checkRecords + 1
			if len(records) != expectedRows {
				t.Errorf("expected %d rows (header+data), got %d", expectedRows, len(records))
			}

			// Validate header columns
			header := records[0]
			expectedCols := []string{"ID", "VIN", "Make", "Model", "Year", "Price", "Status", "Stocked At", "Days in Stock", "Is Aging", "Created At"}
			if len(header) != len(expectedCols) {
				t.Errorf("expected %d header columns, got %d", len(expectedCols), len(header))
			}
			for i, col := range expectedCols {
				if header[i] != col {
					t.Errorf("header[%d]: expected %q, got %q", i, col, header[i])
				}
			}
		})
	}
}

func TestVehicleService_ExportCSV_NilPriceColumn(t *testing.T) {
	now := time.Now().UTC()
	vehicles := []models.Vehicle{
		{
			ID:        uuid.New(),
			VIN:       "1HGBH41JXMN109186",
			Make:      "Honda",
			Model:     "Civic",
			Year:      2023,
			Price:     nil, // no price
			Status:    "available",
			StockedAt: now.Add(-10 * 24 * time.Hour),
			CreatedAt: now,
		},
	}
	repo := &mockVehicleRepo{vehicles: vehicles, total: 1}
	svc := NewVehicleService(repo, &mockDealershipRepoForVehicle{}, &mockCacheInvalidator{})

	data, err := svc.ExportCSV(context.Background(), models.VehicleFilters{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	r := csv.NewReader(bytes.NewReader(data))
	records, _ := r.ReadAll()
	// data row is records[1], price column is index 5
	if records[1][5] != "" {
		t.Errorf("expected empty price for nil, got %q", records[1][5])
	}
}
