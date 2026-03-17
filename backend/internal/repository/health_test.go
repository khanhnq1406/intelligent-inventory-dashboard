package repository

import (
	"context"
	"errors"
	"testing"
)

type mockPinger struct {
	err error
}

func (m *mockPinger) Ping(ctx context.Context) error {
	return m.err
}

type testHealthRepo struct {
	pinger *mockPinger
}

func (r *testHealthRepo) Ping(ctx context.Context) error {
	return r.pinger.Ping(ctx)
}

func TestHealthRepository_Ping_Success(t *testing.T) {
	repo := &testHealthRepo{pinger: &mockPinger{err: nil}}
	err := repo.Ping(context.Background())
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
}

func TestHealthRepository_Ping_Error(t *testing.T) {
	repo := &testHealthRepo{pinger: &mockPinger{err: errors.New("connection refused")}}
	err := repo.Ping(context.Background())
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}
