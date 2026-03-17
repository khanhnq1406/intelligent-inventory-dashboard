package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type pgxVehicle struct {
	pool *pgxpool.Pool
}

func NewVehicleRepository(pool *pgxpool.Pool) VehicleRepository {
	return &pgxVehicle{pool: pool}
}

// sortColumnMap whitelists allowed sort columns to prevent SQL injection.
var sortColumnMap = map[string]string{
	"stocked_at": "v.stocked_at",
	"price":      "v.price",
	"year":       "v.year",
	"make":       "v.make",
}

func (r *pgxVehicle) List(ctx context.Context, filters models.VehicleFilters) ([]models.Vehicle, int, error) {
	// Build dynamic WHERE clause
	var conditions []string
	var args []interface{}
	argIdx := 1

	if filters.DealershipID != nil {
		conditions = append(conditions, fmt.Sprintf("v.dealership_id = $%d", argIdx))
		args = append(args, *filters.DealershipID)
		argIdx++
	}
	if filters.Make != "" {
		conditions = append(conditions, fmt.Sprintf("v.make ILIKE $%d", argIdx))
		args = append(args, "%"+filters.Make+"%")
		argIdx++
	}
	if filters.Model != "" {
		conditions = append(conditions, fmt.Sprintf("v.model ILIKE $%d", argIdx))
		args = append(args, "%"+filters.Model+"%")
		argIdx++
	}
	if filters.Status != "" {
		conditions = append(conditions, fmt.Sprintf("v.status = $%d", argIdx))
		args = append(args, filters.Status)
		argIdx++
	}
	if filters.Aging != nil && *filters.Aging {
		conditions = append(conditions, "v.stocked_at <= NOW() - INTERVAL '90 days'")
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total matching rows
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM vehicles v %s", whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting vehicles: %w", err)
	}

	// Sort column (whitelisted)
	sortCol := "v.stocked_at"
	if col, ok := sortColumnMap[filters.SortBy]; ok {
		sortCol = col
	}
	sortOrder := "DESC"
	if filters.Order == "asc" {
		sortOrder = "ASC"
	}

	// Pagination
	offset := (filters.Page - 1) * filters.PageSize

	// Main query
	query := fmt.Sprintf(`
		SELECT v.id, v.dealership_id, v.make, v.model, v.year, v.vin, v.price, v.status,
		       v.stocked_at, v.created_at, v.updated_at,
		       EXTRACT(EPOCH FROM NOW() - v.stocked_at)::int / 86400 AS days_in_stock
		FROM vehicles v
		%s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d`,
		whereClause, sortCol, sortOrder, argIdx, argIdx+1)

	args = append(args, filters.PageSize, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("querying vehicles: %w", err)
	}
	defer rows.Close()

	var vehicles []models.Vehicle
	for rows.Next() {
		var v models.Vehicle
		if err := rows.Scan(
			&v.ID, &v.DealershipID, &v.Make, &v.Model, &v.Year, &v.VIN, &v.Price, &v.Status,
			&v.StockedAt, &v.CreatedAt, &v.UpdatedAt, &v.DaysInStock,
		); err != nil {
			return nil, 0, fmt.Errorf("scanning vehicle row: %w", err)
		}
		v.IsAging = v.DaysInStock > 90
		vehicles = append(vehicles, v)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterating vehicle rows: %w", err)
	}

	return vehicles, total, nil
}

func (r *pgxVehicle) GetByID(ctx context.Context, id uuid.UUID) (*models.Vehicle, error) {
	var v models.Vehicle
	err := r.pool.QueryRow(ctx, `
		SELECT id, dealership_id, make, model, year, vin, price, status,
		       stocked_at, created_at, updated_at,
		       EXTRACT(EPOCH FROM NOW() - stocked_at)::int / 86400 AS days_in_stock
		FROM vehicles WHERE id = $1`, id).Scan(
		&v.ID, &v.DealershipID, &v.Make, &v.Model, &v.Year, &v.VIN, &v.Price, &v.Status,
		&v.StockedAt, &v.CreatedAt, &v.UpdatedAt, &v.DaysInStock,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("querying vehicle by id: %w", err)
	}
	v.IsAging = v.DaysInStock > 90

	// Fetch actions for this vehicle
	actionRows, err := r.pool.Query(ctx, `
		SELECT id, vehicle_id, action_type, notes, created_by, created_at
		FROM vehicle_actions WHERE vehicle_id = $1 ORDER BY created_at DESC`, id)
	if err != nil {
		return nil, fmt.Errorf("querying vehicle actions: %w", err)
	}
	defer actionRows.Close()

	for actionRows.Next() {
		var a models.VehicleAction
		var notes *string
		if err := actionRows.Scan(&a.ID, &a.VehicleID, &a.ActionType, &notes, &a.CreatedBy, &a.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanning action row: %w", err)
		}
		if notes != nil {
			a.Notes = *notes
		}
		v.Actions = append(v.Actions, a)
	}
	if err := actionRows.Err(); err != nil {
		return nil, fmt.Errorf("iterating action rows: %w", err)
	}

	return &v, nil
}
