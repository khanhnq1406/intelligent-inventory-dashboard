package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type pgxVehicleAction struct {
	pool *pgxpool.Pool
}

func NewVehicleActionRepository(pool *pgxpool.Pool) VehicleActionRepository {
	return &pgxVehicleAction{pool: pool}
}

func (r *pgxVehicleAction) Create(ctx context.Context, action models.VehicleAction) (*models.VehicleAction, error) {
	var a models.VehicleAction
	var notes *string
	err := r.pool.QueryRow(ctx, `
		INSERT INTO vehicle_actions (vehicle_id, action_type, notes, created_by)
		VALUES ($1, $2, $3, $4)
		RETURNING id, vehicle_id, action_type, notes, created_by, created_at`,
		action.VehicleID, action.ActionType, nullableString(action.Notes), action.CreatedBy,
	).Scan(&a.ID, &a.VehicleID, &a.ActionType, &notes, &a.CreatedBy, &a.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("inserting vehicle action: %w", err)
	}
	if notes != nil {
		a.Notes = *notes
	}
	return &a, nil
}

func (r *pgxVehicleAction) ListByVehicleID(ctx context.Context, vehicleID uuid.UUID) ([]models.VehicleAction, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, vehicle_id, action_type, notes, created_by, created_at
		FROM vehicle_actions WHERE vehicle_id = $1 ORDER BY created_at DESC`, vehicleID)
	if err != nil {
		return nil, fmt.Errorf("querying vehicle actions: %w", err)
	}
	defer rows.Close()

	var actions []models.VehicleAction
	for rows.Next() {
		var a models.VehicleAction
		var notes *string
		if err := rows.Scan(&a.ID, &a.VehicleID, &a.ActionType, &notes, &a.CreatedBy, &a.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanning action row: %w", err)
		}
		if notes != nil {
			a.Notes = *notes
		}
		actions = append(actions, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating action rows: %w", err)
	}
	return actions, nil
}

func (r *pgxVehicleAction) ListRecent(ctx context.Context, filter models.RecentActionsFilter) ([]models.RecentAction, error) {
	var dealershipID interface{} = nil
	if filter.DealershipID != nil {
		dealershipID = *filter.DealershipID
	}

	rows, err := r.pool.Query(ctx, `
		SELECT va.id, va.vehicle_id, va.action_type, va.notes, va.created_by, va.created_at,
		       v.make, v.model, v.year,
		       EXTRACT(EPOCH FROM NOW() - v.stocked_at)::int / 86400 AS days_in_stock
		FROM vehicle_actions va
		JOIN vehicles v ON v.id = va.vehicle_id
		WHERE ($1::uuid IS NULL OR v.dealership_id = $1)
		ORDER BY va.created_at DESC
		LIMIT $2`,
		dealershipID, filter.Limit)
	if err != nil {
		return nil, fmt.Errorf("querying recent actions: %w", err)
	}
	defer rows.Close()

	var actions []models.RecentAction
	for rows.Next() {
		var a models.RecentAction
		var notes *string
		if err := rows.Scan(
			&a.ID, &a.VehicleID, &a.ActionType, &notes, &a.CreatedBy, &a.CreatedAt,
			&a.VehicleMake, &a.VehicleModel, &a.VehicleYear, &a.DaysInStock,
		); err != nil {
			return nil, fmt.Errorf("scanning recent action row: %w", err)
		}
		if notes != nil {
			a.Notes = *notes
		}
		actions = append(actions, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating recent action rows: %w", err)
	}
	if actions == nil {
		actions = []models.RecentAction{}
	}
	return actions, nil
}

// nullableString converts an empty string to nil for nullable DB columns.
func nullableString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
