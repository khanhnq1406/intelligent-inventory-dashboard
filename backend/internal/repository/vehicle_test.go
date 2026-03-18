package repository

import (
	"testing"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

func TestBuildConditions_Empty(t *testing.T) {
	conditions, args := buildConditions(models.VehicleFilters{})
	if len(conditions) != 0 {
		t.Errorf("expected 0 conditions, got %d", len(conditions))
	}
	if len(args) != 0 {
		t.Errorf("expected 0 args, got %d", len(args))
	}
}

func TestBuildConditions_DealershipFilter(t *testing.T) {
	id := uuid.New()
	filters := models.VehicleFilters{DealershipID: &id}
	conditions, args := buildConditions(filters)
	if len(conditions) != 1 {
		t.Fatalf("expected 1 condition, got %d", len(conditions))
	}
	if len(args) != 1 {
		t.Fatalf("expected 1 arg, got %d", len(args))
	}
}

func TestBuildConditions_AgingFilter(t *testing.T) {
	aging := true
	filters := models.VehicleFilters{Aging: &aging}
	conditions, _ := buildConditions(filters)
	if len(conditions) != 1 {
		t.Fatalf("expected 1 condition, got %d", len(conditions))
	}
}

func TestValidateSortColumn(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"stocked_at", "v.stocked_at"},
		{"price", "v.price"},
		{"year", "v.year"},
		{"make", "v.make"},
		{"invalid", "v.stocked_at"},
		{"'; DROP TABLE vehicles; --", "v.stocked_at"},
	}
	for _, tt := range tests {
		got := validateSortColumn(tt.input)
		if got != tt.want {
			t.Errorf("validateSortColumn(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestValidateSortOrder(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"asc", "ASC"},
		{"desc", "DESC"},
		{"invalid", "DESC"},
		{"", "DESC"},
	}
	for _, tt := range tests {
		got := validateSortOrder(tt.input)
		if got != tt.want {
			t.Errorf("validateSortOrder(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}
