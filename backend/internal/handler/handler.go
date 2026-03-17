package handler

import (
	"context"
	"net/http"

	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/service"
)

type Server struct {
	healthSvc service.HealthService
}

func NewServer(healthSvc service.HealthService) *Server {
	return &Server{
		healthSvc: healthSvc,
	}
}

func (s *Server) GetHealth(ctx context.Context, request GetHealthRequestObject) (GetHealthResponseObject, error) {
	status, err := s.healthSvc.Check(ctx)
	if err != nil {
		return GetHealth503JSONResponse{
			Status:    Unhealthy,
			Version:   "1.0.0",
			Database:  Disconnected,
			Timestamp: status.Timestamp,
			Uptime:    status.Uptime,
		}, nil
	}

	resp := HealthResponse{
		Status:    HealthResponseStatus(status.Status),
		Version:   status.Version,
		Database:  HealthResponseDatabase(status.Database),
		Timestamp: status.Timestamp,
		Uptime:    status.Uptime,
	}

	if status.Status == "unhealthy" {
		return GetHealth503JSONResponse(resp), nil
	}
	return GetHealth200JSONResponse(resp), nil
}

func (s *Server) ListDealerships(_ context.Context, _ ListDealershipsRequestObject) (ListDealershipsResponseObject, error) {
	return ListDealerships200JSONResponse{}, nil
}

func (s *Server) ListVehicles(_ context.Context, _ ListVehiclesRequestObject) (ListVehiclesResponseObject, error) {
	return ListVehicles200JSONResponse{}, nil
}

func (s *Server) GetVehicle(_ context.Context, _ GetVehicleRequestObject) (GetVehicleResponseObject, error) {
	return GetVehicle404JSONResponse{Code: http.StatusNotFound, Message: "not implemented"}, nil
}

func (s *Server) ListVehicleActions(_ context.Context, _ ListVehicleActionsRequestObject) (ListVehicleActionsResponseObject, error) {
	return ListVehicleActions200JSONResponse{}, nil
}

func (s *Server) CreateVehicleAction(_ context.Context, _ CreateVehicleActionRequestObject) (CreateVehicleActionResponseObject, error) {
	return CreateVehicleAction400JSONResponse{Code: http.StatusBadRequest, Message: "not implemented"}, nil
}

func (s *Server) GetDashboardSummary(_ context.Context, _ GetDashboardSummaryRequestObject) (GetDashboardSummaryResponseObject, error) {
	return GetDashboardSummary200JSONResponse{}, nil
}
