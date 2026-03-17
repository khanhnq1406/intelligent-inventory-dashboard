package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type pgxHealth struct {
	pool *pgxpool.Pool
}

func NewHealthRepository(pool *pgxpool.Pool) HealthRepository {
	return &pgxHealth{pool: pool}
}

func (h *pgxHealth) Ping(ctx context.Context) error {
	return h.pool.Ping(ctx)
}
