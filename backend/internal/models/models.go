package models

import (
	"time"

	"github.com/google/uuid"
)

type Dealership struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Location  string    `json:"location,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Vehicle struct {
	ID           uuid.UUID       `json:"id"`
	DealershipID uuid.UUID       `json:"dealership_id"`
	Make         string          `json:"make"`
	Model        string          `json:"model"`
	Year         int             `json:"year"`
	VIN          string          `json:"vin"`
	Price        *float64        `json:"price,omitempty"`
	Status       string          `json:"status"`
	StockedAt    time.Time       `json:"stocked_at"`
	DaysInStock  int             `json:"days_in_stock"`
	IsAging      bool            `json:"is_aging"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
	Actions      []VehicleAction `json:"actions,omitempty"`
}

type VehicleAction struct {
	ID         uuid.UUID `json:"id"`
	VehicleID  uuid.UUID `json:"vehicle_id"`
	ActionType string    `json:"action_type"`
	Notes      string    `json:"notes,omitempty"`
	CreatedBy  string    `json:"created_by"`
	CreatedAt  time.Time `json:"created_at"`
}

// RecentAction is returned by GET /api/v1/actions/recent.
// It enriches a VehicleAction with vehicle context for dashboard display.
type RecentAction struct {
	ID           uuid.UUID `json:"id"`
	VehicleID    uuid.UUID `json:"vehicle_id"`
	VehicleMake  string    `json:"vehicle_make"`
	VehicleModel string    `json:"vehicle_model"`
	VehicleYear  int       `json:"vehicle_year"`
	DaysInStock  int       `json:"days_in_stock"`
	ActionType   string    `json:"action_type"`
	Notes        string    `json:"notes,omitempty"`
	CreatedBy    string    `json:"created_by"`
	CreatedAt    time.Time `json:"created_at"`
}

// RecentActionsFilter holds validated params for the ListRecent query.
type RecentActionsFilter struct {
	DealershipID *uuid.UUID
	Limit        int
}

type CreateActionInput struct {
	ActionType string `json:"action_type"`
	Notes      string `json:"notes,omitempty"`
	CreatedBy  string `json:"created_by"`
}

// CreateVehicleInput contains validated data for creating a new vehicle.
type CreateVehicleInput struct {
	DealershipID uuid.UUID
	Make         string
	Model        string
	Year         int
	VIN          string
	Price        *float64 // optional
	Status       string
	StockedAt    time.Time // defaults to now if not provided
}

type VehicleFilters struct {
	DealershipID *uuid.UUID
	Make         string
	Model        string
	Status       string
	Aging        *bool
	SortBy       string
	Order        string
	Page         int
	PageSize     int
}

type PaginatedVehicles struct {
	Items      []Vehicle `json:"items"`
	Total      int       `json:"total"`
	Page       int       `json:"page"`
	PageSize   int       `json:"page_size"`
	TotalPages int       `json:"total_pages"`
}

type DashboardSummary struct {
	TotalVehicles    int             `json:"total_vehicles"`
	AgingVehicles    int             `json:"aging_vehicles"`
	AvgDaysInStock   float64         `json:"average_days_in_stock"`
	ActionsThisMonth int             `json:"actions_this_month"`
	ByMake           []MakeSummary   `json:"by_make"`
	ByStatus         []StatusSummary `json:"by_status"`
}

type MakeSummary struct {
	Make       string `json:"make"`
	Count      int    `json:"count"`
	AgingCount int    `json:"aging_count"`
}

type StatusSummary struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

type HealthStatus struct {
	Status    string    `json:"status"`
	Version   string    `json:"version"`
	Uptime    string    `json:"uptime"`
	Database  string    `json:"database"`
	Timestamp time.Time `json:"timestamp"`
}
