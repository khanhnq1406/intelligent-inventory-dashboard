package service

import (
	"context"
	"fmt"

	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/repository"
)

type dashboardService struct {
	repo  repository.DashboardRepository
	cache *DashboardCache
}

func NewDashboardService(repo repository.DashboardRepository, cache *DashboardCache) DashboardService {
	return &dashboardService{repo: repo, cache: cache}
}

func (s *dashboardService) GetSummary(ctx context.Context) (*models.DashboardSummary, error) {
	// Check cache first
	if data, ok := s.cache.Get(); ok {
		return data, nil
	}

	// Cache miss — fetch from DB
	summary, err := s.repo.GetSummary(ctx)
	if err != nil {
		return nil, fmt.Errorf("getting dashboard summary: %w", err)
	}

	// Cache the result
	s.cache.Set(summary)

	return summary, nil
}
