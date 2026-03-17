package service

import (
	"context"
	"fmt"

	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/repository"
)

type dealershipService struct {
	repo repository.DealershipRepository
}

func NewDealershipService(repo repository.DealershipRepository) DealershipService {
	return &dealershipService{repo: repo}
}

func (s *dealershipService) List(ctx context.Context) ([]models.Dealership, error) {
	dealerships, err := s.repo.List(ctx)
	if err != nil {
		return nil, fmt.Errorf("listing dealerships: %w", err)
	}
	return dealerships, nil
}
