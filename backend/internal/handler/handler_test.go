package handler

import (
	"context"
	"errors"
	"testing"

	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type mockHealthService struct {
	status *models.HealthStatus
	err    error
}

func (m *mockHealthService) Check(_ context.Context) (*models.HealthStatus, error) {
	return m.status, m.err
}

func TestGetHealth_Healthy(t *testing.T) {
	svc := &mockHealthService{
		status: &models.HealthStatus{
			Status:   "healthy",
			Version:  "1.0.0",
			Database: "connected",
			Uptime:   "1m0s",
		},
	}
	server := NewServer(svc)

	resp, err := server.GetHealth(context.Background(), GetHealthRequestObject{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := resp.(GetHealth200JSONResponse); !ok {
		t.Errorf("expected GetHealth200JSONResponse, got %T", resp)
	}
}

func TestGetHealth_Unhealthy(t *testing.T) {
	svc := &mockHealthService{
		status: &models.HealthStatus{
			Status:   "unhealthy",
			Version:  "1.0.0",
			Database: "disconnected",
			Uptime:   "1m0s",
		},
	}
	server := NewServer(svc)

	resp, err := server.GetHealth(context.Background(), GetHealthRequestObject{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := resp.(GetHealth503JSONResponse); !ok {
		t.Errorf("expected GetHealth503JSONResponse, got %T", resp)
	}
}

func TestGetHealth_ServiceError(t *testing.T) {
	svc := &mockHealthService{
		status: &models.HealthStatus{
			Status:   "unhealthy",
			Database: "disconnected",
		},
		err: errors.New("service error"),
	}
	server := NewServer(svc)

	resp, err := server.GetHealth(context.Background(), GetHealthRequestObject{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := resp.(GetHealth503JSONResponse); !ok {
		t.Errorf("expected GetHealth503JSONResponse, got %T", resp)
	}
}
