package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/repository"
)

// validSortColumns whitelists allowed sort values.
var validSortColumns = map[string]bool{
	"stocked_at": true,
	"price":      true,
	"year":       true,
	"make":       true,
}

var vinPattern = regexp.MustCompile(`^[A-HJ-NPR-Z0-9]{17}$`)

const exportRowLimit = 10_000

type vehicleService struct {
	repo           repository.VehicleRepository
	dealershipRepo repository.DealershipRepository
	cache          CacheInvalidator
}

func NewVehicleService(repo repository.VehicleRepository, dealershipRepo repository.DealershipRepository, cache CacheInvalidator) VehicleService {
	return &vehicleService{repo: repo, dealershipRepo: dealershipRepo, cache: cache}
}

func (s *vehicleService) List(ctx context.Context, filters models.VehicleFilters) (*models.PaginatedVehicles, error) {
	// Normalize filters
	if filters.Page < 1 {
		filters.Page = 1
	}
	if filters.PageSize < 1 {
		filters.PageSize = 20
	}
	if filters.PageSize > 100 {
		filters.PageSize = 100
	}
	if !validSortColumns[filters.SortBy] {
		filters.SortBy = "stocked_at"
	}
	if filters.Order != "asc" && filters.Order != "desc" {
		filters.Order = "desc"
	}

	vehicles, total, err := s.repo.List(ctx, filters)
	if err != nil {
		return nil, fmt.Errorf("listing vehicles: %w", err)
	}

	if vehicles == nil {
		vehicles = []models.Vehicle{}
	}

	totalPages := 0
	if total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(filters.PageSize)))
	}

	return &models.PaginatedVehicles{
		Items:      vehicles,
		Total:      total,
		Page:       filters.Page,
		PageSize:   filters.PageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *vehicleService) GetByID(ctx context.Context, id uuid.UUID) (*models.Vehicle, error) {
	vehicle, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("getting vehicle by id: %w", err)
	}
	return vehicle, nil
}

func (s *vehicleService) Create(ctx context.Context, input models.CreateVehicleInput) (*models.Vehicle, error) {
	// Trim and validate Make
	input.Make = strings.TrimSpace(input.Make)
	if len(input.Make) == 0 || len(input.Make) > 100 {
		return nil, fmt.Errorf("make must be 1-100 characters")
	}

	// Trim and validate Model
	input.Model = strings.TrimSpace(input.Model)
	if len(input.Model) == 0 || len(input.Model) > 100 {
		return nil, fmt.Errorf("model must be 1-100 characters")
	}

	// Validate Year
	if input.Year < 1900 || input.Year > 2100 {
		return nil, fmt.Errorf("year must be between 1900 and 2100")
	}

	// Validate VIN
	input.VIN = strings.ToUpper(strings.TrimSpace(input.VIN))
	if !vinPattern.MatchString(input.VIN) {
		return nil, fmt.Errorf("VIN must be exactly 17 uppercase alphanumeric characters (excluding I, O, Q)")
	}

	// Validate Price (if provided)
	if input.Price != nil {
		if *input.Price < 0 {
			return nil, fmt.Errorf("price cannot be negative")
		}
		if *input.Price > 10_000_000 {
			return nil, fmt.Errorf("price cannot exceed 10,000,000")
		}
	}

	// Validate Status
	validStatuses := map[string]bool{"available": true, "sold": true, "reserved": true}
	if !validStatuses[input.Status] {
		return nil, fmt.Errorf("status must be available, sold, or reserved")
	}

	// Handle StockedAt default + future check
	if input.StockedAt.IsZero() {
		input.StockedAt = time.Now().UTC()
	} else if input.StockedAt.After(time.Now()) {
		return nil, fmt.Errorf("stocked date cannot be in the future")
	}

	// Check dealership exists
	dealership, err := s.dealershipRepo.GetByID(ctx, input.DealershipID)
	if err != nil {
		return nil, fmt.Errorf("checking dealership: %w", err)
	}
	if dealership == nil {
		return nil, fmt.Errorf("dealership not found")
	}

	// Create vehicle
	vehicle, err := s.repo.Create(ctx, input)
	if err != nil {
		if errors.Is(err, repository.ErrDuplicateVIN) {
			return nil, repository.ErrDuplicateVIN
		}
		return nil, fmt.Errorf("creating vehicle: %w", err)
	}

	// Invalidate dashboard cache
	s.cache.Invalidate()

	return vehicle, nil
}

func (s *vehicleService) ExportCSV(ctx context.Context, filters models.VehicleFilters) ([]byte, error) {
	// Ensure sort defaults
	if !validSortColumns[filters.SortBy] {
		filters.SortBy = "stocked_at"
	}
	if filters.Order != "asc" && filters.Order != "desc" {
		filters.Order = "desc"
	}

	vehicles, total, err := s.repo.ListAll(ctx, filters)
	if err != nil {
		return nil, fmt.Errorf("fetching vehicles for export: %w", err)
	}
	if total > exportRowLimit {
		return nil, fmt.Errorf("export exceeds %d row limit: found %d vehicles; apply filters to narrow results", exportRowLimit, total)
	}

	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	// Write header row
	header := []string{
		"ID", "VIN", "Make", "Model", "Year", "Price",
		"Status", "Stocked At", "Days in Stock", "Is Aging", "Created At",
	}
	if err := w.Write(header); err != nil {
		return nil, fmt.Errorf("writing CSV header: %w", err)
	}

	// Write data rows
	for _, v := range vehicles {
		price := ""
		if v.Price != nil {
			price = fmt.Sprintf("%.2f", *v.Price)
		}
		row := []string{
			v.ID.String(),
			v.VIN,
			v.Make,
			v.Model,
			strconv.Itoa(v.Year),
			price,
			v.Status,
			v.StockedAt.UTC().Format(time.RFC3339),
			strconv.Itoa(v.DaysInStock),
			strconv.FormatBool(v.IsAging),
			v.CreatedAt.UTC().Format(time.RFC3339),
		}
		if err := w.Write(row); err != nil {
			return nil, fmt.Errorf("writing CSV row: %w", err)
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, fmt.Errorf("flushing CSV writer: %w", err)
	}
	return buf.Bytes(), nil
}
