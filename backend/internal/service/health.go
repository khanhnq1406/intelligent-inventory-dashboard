package service

import (
	"context"
	"fmt"
	"time"

	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/repository"
)

type healthService struct {
	repo      repository.HealthRepository
	startTime time.Time
	version   string
}

func NewHealthService(repo repository.HealthRepository, version string) HealthService {
	return &healthService{
		repo:      repo,
		startTime: time.Now(),
		version:   version,
	}
}

func (s *healthService) Check(ctx context.Context) (*models.HealthStatus, error) {
	status := &models.HealthStatus{
		Version:   s.version,
		Uptime:    fmt.Sprintf("%s", time.Since(s.startTime).Round(time.Second)),
		Timestamp: time.Now(),
	}

	if err := s.repo.Ping(ctx); err != nil {
		status.Status = "unhealthy"
		status.Database = "disconnected"
		return status, nil
	}

	status.Status = "healthy"
	status.Database = "connected"
	return status, nil
}
