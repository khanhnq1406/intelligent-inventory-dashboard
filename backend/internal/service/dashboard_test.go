package service

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type mockDashboardRepo struct {
	summary *models.DashboardSummary
	err     error
	calls   int
}

func (m *mockDashboardRepo) GetSummary(_ context.Context) (*models.DashboardSummary, error) {
	m.calls++
	return m.summary, m.err
}

func TestDashboardCache_GetSet(t *testing.T) {
	cache := NewDashboardCache(30 * time.Second)

	// Initially empty
	data, ok := cache.Get()
	if ok || data != nil {
		t.Error("expected cache miss on empty cache")
	}

	// Set data
	summary := &models.DashboardSummary{TotalVehicles: 10, AgingVehicles: 3}
	cache.Set(summary)

	// Get should return cached data
	data, ok = cache.Get()
	if !ok || data == nil {
		t.Fatal("expected cache hit after Set")
	}
	if data.TotalVehicles != 10 {
		t.Errorf("expected 10 total vehicles, got %d", data.TotalVehicles)
	}
}

func TestDashboardCache_Invalidate(t *testing.T) {
	cache := NewDashboardCache(30 * time.Second)
	summary := &models.DashboardSummary{TotalVehicles: 10}
	cache.Set(summary)

	cache.Invalidate()

	data, ok := cache.Get()
	if ok || data != nil {
		t.Error("expected cache miss after Invalidate")
	}
}

func TestDashboardCache_Expiry(t *testing.T) {
	cache := NewDashboardCache(1 * time.Millisecond)
	summary := &models.DashboardSummary{TotalVehicles: 10}
	cache.Set(summary)

	time.Sleep(5 * time.Millisecond)

	data, ok := cache.Get()
	if ok || data != nil {
		t.Error("expected cache miss after TTL expiry")
	}
}

func TestDashboardCache_ThreadSafety(t *testing.T) {
	cache := NewDashboardCache(30 * time.Second)
	var wg sync.WaitGroup

	for i := 0; i < 100; i++ {
		wg.Add(3)
		go func() {
			defer wg.Done()
			cache.Set(&models.DashboardSummary{TotalVehicles: 1})
		}()
		go func() {
			defer wg.Done()
			cache.Get()
		}()
		go func() {
			defer wg.Done()
			cache.Invalidate()
		}()
	}
	wg.Wait()
}

func TestDashboardService_GetSummary(t *testing.T) {
	summary := &models.DashboardSummary{
		TotalVehicles: 50, AgingVehicles: 10, AvgDaysInStock: 45.5,
		ByMake:   []models.MakeSummary{{Make: "Honda", Count: 20, AgingCount: 5}},
		ByStatus: []models.StatusSummary{{Status: "available", Count: 40}},
	}

	tests := []struct {
		name      string
		repo      *mockDashboardRepo
		preCache  bool
		wantCalls int
		wantErr   bool
	}{
		{
			name:      "fetches from DB on cache miss",
			repo:      &mockDashboardRepo{summary: summary},
			wantCalls: 1,
		},
		{
			name:      "returns cached data on cache hit",
			repo:      &mockDashboardRepo{summary: summary},
			preCache:  true,
			wantCalls: 0,
		},
		{
			name:    "propagates repo error",
			repo:    &mockDashboardRepo{err: errors.New("db error")},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cache := NewDashboardCache(30 * time.Second)
			if tt.preCache {
				cache.Set(summary)
			}
			svc := NewDashboardService(tt.repo, cache)
			result, err := svc.GetSummary(context.Background())
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result == nil {
				t.Fatal("expected summary, got nil")
			}
			if result.TotalVehicles != 50 {
				t.Errorf("expected 50 total vehicles, got %d", result.TotalVehicles)
			}
			if tt.repo.calls != tt.wantCalls {
				t.Errorf("expected %d repo calls, got %d", tt.wantCalls, tt.repo.calls)
			}
		})
	}
}
