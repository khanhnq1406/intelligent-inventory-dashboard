package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/config"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/handler"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/middleware"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/repository"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/service"
)

const version = "1.0.0"

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load configuration", slog.String("error", err.Error()))
		os.Exit(1)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to create database pool", slog.String("error", err.Error()))
		os.Exit(1)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		logger.Warn("database not reachable at startup", slog.String("error", err.Error()))
	}

	// Create layers
	healthRepo := repository.NewHealthRepository(pool)
	healthSvc := service.NewHealthService(healthRepo, version)
	srv := handler.NewServer(healthSvc)

	// Create strict handler from oapi-codegen generated interface
	strictHandler := handler.NewStrictHandler(srv, nil)

	// Set up Chi router
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger(logger))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
		ExposedHeaders:   []string{"X-Request-ID"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Register generated routes
	handler.HandlerFromMux(strictHandler, r)

	httpServer := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Port),
		Handler: r,
	}

	// Graceful shutdown
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	go func() {
		logger.Info("server starting", slog.Int("port", cfg.Port), slog.String("version", version))
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server failed", slog.String("error", err.Error()))
			os.Exit(1)
		}
	}()

	<-done
	logger.Info("shutting down server...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		logger.Error("server shutdown failed", slog.String("error", err.Error()))
		os.Exit(1)
	}

	logger.Info("server stopped gracefully")
}
