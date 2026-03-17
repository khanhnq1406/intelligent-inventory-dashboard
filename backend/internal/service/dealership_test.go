package service

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type mockDealershipRepo struct {
	dealerships []models.Dealership
	err         error
}

func (m *mockDealershipRepo) List(_ context.Context) ([]models.Dealership, error) {
	return m.dealerships, m.err
}

func TestDealershipService_List(t *testing.T) {
	tests := []struct {
		name      string
		repo      *mockDealershipRepo
		wantCount int
		wantErr   bool
	}{
		{
			name: "returns dealerships",
			repo: &mockDealershipRepo{
				dealerships: []models.Dealership{
					{ID: uuid.New(), Name: "Test Dealership"},
					{ID: uuid.New(), Name: "Another Dealership"},
				},
			},
			wantCount: 2,
		},
		{
			name:      "returns empty list",
			repo:      &mockDealershipRepo{dealerships: []models.Dealership{}},
			wantCount: 0,
		},
		{
			name:    "propagates repo error",
			repo:    &mockDealershipRepo{err: errors.New("db error")},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewDealershipService(tt.repo)
			result, err := svc.List(context.Background())
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(result) != tt.wantCount {
				t.Errorf("expected %d dealerships, got %d", tt.wantCount, len(result))
			}
		})
	}
}
