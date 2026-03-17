package service

import (
	"context"
	"errors"
	"testing"
)

type mockHealthRepo struct {
	pingErr error
}

func (m *mockHealthRepo) Ping(ctx context.Context) error {
	return m.pingErr
}

func TestHealthService_Check_Healthy(t *testing.T) {
	repo := &mockHealthRepo{pingErr: nil}
	svc := NewHealthService(repo, "1.0.0")

	status, err := svc.Check(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if status.Status != "healthy" {
		t.Errorf("expected status healthy, got %s", status.Status)
	}
	if status.Database != "connected" {
		t.Errorf("expected database connected, got %s", status.Database)
	}
	if status.Version != "1.0.0" {
		t.Errorf("expected version 1.0.0, got %s", status.Version)
	}
	if status.Uptime == "" {
		t.Error("expected non-empty uptime")
	}
	if status.Timestamp.IsZero() {
		t.Error("expected non-zero timestamp")
	}
}

func TestHealthService_Check_Unhealthy(t *testing.T) {
	repo := &mockHealthRepo{pingErr: errors.New("connection refused")}
	svc := NewHealthService(repo, "1.0.0")

	status, err := svc.Check(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if status.Status != "unhealthy" {
		t.Errorf("expected status unhealthy, got %s", status.Status)
	}
	if status.Database != "disconnected" {
		t.Errorf("expected database disconnected, got %s", status.Database)
	}
}
