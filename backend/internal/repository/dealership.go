package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
)

type pgxDealership struct {
	pool *pgxpool.Pool
}

func NewDealershipRepository(pool *pgxpool.Pool) DealershipRepository {
	return &pgxDealership{pool: pool}
}

func (r *pgxDealership) List(ctx context.Context) ([]models.Dealership, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, location, created_at, updated_at FROM dealerships ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("querying dealerships: %w", err)
	}
	defer rows.Close()

	var dealerships []models.Dealership
	for rows.Next() {
		var d models.Dealership
		var location *string
		if err := rows.Scan(&d.ID, &d.Name, &location, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning dealership row: %w", err)
		}
		if location != nil {
			d.Location = *location
		}
		dealerships = append(dealerships, d)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating dealership rows: %w", err)
	}
	return dealerships, nil
}
