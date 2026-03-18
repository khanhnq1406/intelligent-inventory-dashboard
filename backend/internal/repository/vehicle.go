package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
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

// buildConditions builds WHERE clause conditions and args from filters.
func buildConditions(filters models.VehicleFilters) ([]string, []interface{}) {
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
	_ = argIdx // suppress unused warning
	return conditions, args
}

// buildWhereClause joins conditions into a SQL WHERE clause.
func buildWhereClause(conditions []string) string {
	if len(conditions) == 0 {
		return ""
	}
	return "WHERE " + strings.Join(conditions, " AND ")
}

// validateSortColumn returns whitelisted column name, defaulting to v.stocked_at.
func validateSortColumn(sortBy string) string {
	if col, ok := sortColumnMap[sortBy]; ok {
		return col
	}
	return "v.stocked_at"
}

// validateSortOrder returns "ASC" or "DESC".
func validateSortOrder(order string) string {
	if order == "asc" {
		return "ASC"
	}
	return "DESC"
}

func (r *pgxVehicle) List(ctx context.Context, filters models.VehicleFilters) ([]models.Vehicle, int, error) {
	conditions, args := buildConditions(filters)
	whereClause := buildWhereClause(conditions)

	// Count total matching rows
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM vehicles v %s", whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting vehicles: %w", err)
	}

	sortCol := validateSortColumn(filters.SortBy)
	sortOrder := validateSortOrder(filters.Order)

	// Pagination
	offset := (filters.Page - 1) * filters.PageSize
	argIdx := len(args) + 1

	// Main query — LEFT JOIN LATERAL fetches last 3 actions per vehicle.
	// The lateral subquery binds only v.id (DB-internal); no user input flows in.
	query := fmt.Sprintf(`
		SELECT v.id, v.dealership_id, v.make, v.model, v.year, v.vin, v.price, v.status,
		       v.stocked_at, v.created_at, v.updated_at,
		       EXTRACT(EPOCH FROM NOW() - v.stocked_at)::int / 86400 AS days_in_stock,
		       a.id        AS action_id,
		       a.action_type,
		       a.notes,
		       a.created_by,
		       a.created_at AS action_created_at
		FROM vehicles v
		LEFT JOIN LATERAL (
		    SELECT id, action_type, notes, created_by, created_at
		    FROM vehicle_actions
		    WHERE vehicle_id = v.id
		    ORDER BY created_at DESC
		    LIMIT 3
		) a ON true
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

	// vehicleMap preserves insertion order while grouping action rows by vehicle ID.
	vehicleMap := make(map[uuid.UUID]*models.Vehicle)
	var vehicleOrder []uuid.UUID

	for rows.Next() {
		var v models.Vehicle
		// Nullable action fields — NULL when vehicle has no actions
		var (
			actionID        *uuid.UUID
			actionType      *string
			actionNotes     *string
			actionCreatedBy *string
			actionCreatedAt *time.Time
		)
		if err := rows.Scan(
			&v.ID, &v.DealershipID, &v.Make, &v.Model, &v.Year, &v.VIN, &v.Price, &v.Status,
			&v.StockedAt, &v.CreatedAt, &v.UpdatedAt, &v.DaysInStock,
			&actionID, &actionType, &actionNotes, &actionCreatedBy, &actionCreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scanning vehicle row: %w", err)
		}
		v.IsAging = v.DaysInStock > 90

		existing, seen := vehicleMap[v.ID]
		if !seen {
			v.Actions = []models.VehicleAction{}
			vehicleMap[v.ID] = &v
			vehicleOrder = append(vehicleOrder, v.ID)
			existing = vehicleMap[v.ID]
		}

		if actionID != nil {
			a := models.VehicleAction{
				ID:         *actionID,
				VehicleID:  existing.ID,
				ActionType: *actionType,
				CreatedBy:  *actionCreatedBy,
				CreatedAt:  *actionCreatedAt,
			}
			if actionNotes != nil {
				a.Notes = *actionNotes
			}
			existing.Actions = append(existing.Actions, a)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterating vehicle rows: %w", err)
	}

	vehicles := make([]models.Vehicle, 0, len(vehicleOrder))
	for _, id := range vehicleOrder {
		vehicles = append(vehicles, *vehicleMap[id])
	}
	return vehicles, total, nil
}

func (r *pgxVehicle) ListAll(ctx context.Context, filters models.VehicleFilters) ([]models.Vehicle, int, error) {
	conditions, args := buildConditions(filters)
	whereClause := buildWhereClause(conditions)

	sortCol := validateSortColumn(filters.SortBy)
	sortOrder := validateSortOrder(filters.Order)

	// Count first
	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM vehicles v %s", whereClause)
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting vehicles for export: %w", err)
	}

	// Fetch all rows (no LIMIT/OFFSET)
	query := fmt.Sprintf(`
		SELECT v.id, v.dealership_id, v.make, v.model, v.year, v.vin, v.price,
		       v.status, v.stocked_at, v.created_at, v.updated_at,
		       EXTRACT(EPOCH FROM NOW() - v.stocked_at)::int / 86400 AS days_in_stock
		FROM vehicles v %s
		ORDER BY %s %s`, whereClause, sortCol, sortOrder)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("querying vehicles for export: %w", err)
	}
	defer rows.Close()

	var vehicles []models.Vehicle
	for rows.Next() {
		var v models.Vehicle
		if err := rows.Scan(&v.ID, &v.DealershipID, &v.Make, &v.Model, &v.Year,
			&v.VIN, &v.Price, &v.Status, &v.StockedAt, &v.CreatedAt, &v.UpdatedAt,
			&v.DaysInStock); err != nil {
			return nil, 0, fmt.Errorf("scanning vehicle for export: %w", err)
		}
		v.IsAging = v.DaysInStock > 90
		vehicles = append(vehicles, v)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterating vehicles for export: %w", err)
	}
	if vehicles == nil {
		vehicles = []models.Vehicle{}
	}
	return vehicles, total, nil
}

func (r *pgxVehicle) Create(ctx context.Context, input models.CreateVehicleInput) (*models.Vehicle, error) {
	query := `
		INSERT INTO vehicles (dealership_id, make, model, year, vin, price, status, stocked_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, dealership_id, make, model, year, vin, price, status, stocked_at,
		          created_at, updated_at,
		          EXTRACT(EPOCH FROM NOW() - stocked_at)::int / 86400 AS days_in_stock`

	var v models.Vehicle
	err := r.pool.QueryRow(ctx, query,
		input.DealershipID,
		input.Make,
		input.Model,
		input.Year,
		input.VIN,
		input.Price,
		input.Status,
		input.StockedAt,
	).Scan(
		&v.ID, &v.DealershipID, &v.Make, &v.Model, &v.Year, &v.VIN,
		&v.Price, &v.Status, &v.StockedAt, &v.CreatedAt, &v.UpdatedAt,
		&v.DaysInStock,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrDuplicateVIN
		}
		return nil, fmt.Errorf("creating vehicle: %w", err)
	}
	v.IsAging = v.DaysInStock > 90
	v.Actions = []models.VehicleAction{}
	return &v, nil
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
