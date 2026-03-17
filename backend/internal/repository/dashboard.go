package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type pgxDashboard struct {
	pool *pgxpool.Pool
}

func NewDashboardRepository(pool *pgxpool.Pool) DashboardRepository {
	return &pgxDashboard{pool: pool}
}

func (r *pgxDashboard) GetSummary(ctx context.Context) (*models.DashboardSummary, error) {
	summary := &models.DashboardSummary{}

	// Total and aging counts + average days
	err := r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) AS total_vehicles,
			COUNT(*) FILTER (WHERE stocked_at <= NOW() - INTERVAL '90 days') AS aging_vehicles,
			COALESCE(AVG(EXTRACT(EPOCH FROM NOW() - stocked_at) / 86400), 0) AS avg_days_in_stock
		FROM vehicles`).Scan(&summary.TotalVehicles, &summary.AgingVehicles, &summary.AvgDaysInStock)
	if err != nil {
		return nil, fmt.Errorf("querying vehicle totals: %w", err)
	}

	// By make
	makeRows, err := r.pool.Query(ctx, `
		SELECT
			make,
			COUNT(*) AS count,
			COUNT(*) FILTER (WHERE stocked_at <= NOW() - INTERVAL '90 days') AS aging_count
		FROM vehicles
		GROUP BY make
		ORDER BY count DESC`)
	if err != nil {
		return nil, fmt.Errorf("querying by make: %w", err)
	}
	defer makeRows.Close()

	for makeRows.Next() {
		var ms models.MakeSummary
		if err := makeRows.Scan(&ms.Make, &ms.Count, &ms.AgingCount); err != nil {
			return nil, fmt.Errorf("scanning make summary: %w", err)
		}
		summary.ByMake = append(summary.ByMake, ms)
	}
	if err := makeRows.Err(); err != nil {
		return nil, fmt.Errorf("iterating make rows: %w", err)
	}

	// By status
	statusRows, err := r.pool.Query(ctx, `
		SELECT status, COUNT(*) AS count
		FROM vehicles
		GROUP BY status
		ORDER BY count DESC`)
	if err != nil {
		return nil, fmt.Errorf("querying by status: %w", err)
	}
	defer statusRows.Close()

	for statusRows.Next() {
		var ss models.StatusSummary
		if err := statusRows.Scan(&ss.Status, &ss.Count); err != nil {
			return nil, fmt.Errorf("scanning status summary: %w", err)
		}
		summary.ByStatus = append(summary.ByStatus, ss)
	}
	if err := statusRows.Err(); err != nil {
		return nil, fmt.Errorf("iterating status rows: %w", err)
	}

	// Ensure non-nil slices
	if summary.ByMake == nil {
		summary.ByMake = []models.MakeSummary{}
	}
	if summary.ByStatus == nil {
		summary.ByStatus = []models.StatusSummary{}
	}

	return summary, nil
}
