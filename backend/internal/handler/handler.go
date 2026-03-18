package handler

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/repository"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/service"
)

type Server struct {
	healthSvc     service.HealthService
	dealershipSvc service.DealershipService
	vehicleSvc    service.VehicleService
	actionSvc     service.VehicleActionService
	dashboardSvc  service.DashboardService
}

func NewServer(
	healthSvc service.HealthService,
	dealershipSvc service.DealershipService,
	vehicleSvc service.VehicleService,
	actionSvc service.VehicleActionService,
	dashboardSvc service.DashboardService,
) *Server {
	return &Server{
		healthSvc:     healthSvc,
		dealershipSvc: dealershipSvc,
		vehicleSvc:    vehicleSvc,
		actionSvc:     actionSvc,
		dashboardSvc:  dashboardSvc,
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

func (s *Server) ListDealerships(ctx context.Context, _ ListDealershipsRequestObject) (ListDealershipsResponseObject, error) {
	dealerships, err := s.dealershipSvc.List(ctx)
	if err != nil {
		return ListDealerships500JSONResponse{
			Code:    http.StatusInternalServerError,
			Message: "Failed to retrieve dealerships",
		}, nil
	}

	resp := make(ListDealerships200JSONResponse, 0, len(dealerships))
	for _, d := range dealerships {
		dealer := Dealership{
			Id:        d.ID,
			Name:      d.Name,
			CreatedAt: d.CreatedAt,
			UpdatedAt: d.UpdatedAt,
		}
		if d.Location != "" {
			loc := d.Location
			dealer.Location = &loc
		}
		resp = append(resp, dealer)
	}
	return resp, nil
}

func (s *Server) ListVehicles(ctx context.Context, request ListVehiclesRequestObject) (ListVehiclesResponseObject, error) {
	filters := paramsToFilters(request.Params)

	result, err := s.vehicleSvc.List(ctx, filters)
	if err != nil {
		return ListVehicles500JSONResponse{
			Code:    http.StatusInternalServerError,
			Message: "Failed to retrieve vehicles",
		}, nil
	}

	items := make([]Vehicle, 0, len(result.Items))
	for _, v := range result.Items {
		resp := modelVehicleToResponse(v)
		actions := make([]VehicleAction, 0, len(v.Actions))
		for _, a := range v.Actions {
			actions = append(actions, modelActionToResponse(a))
		}
		resp.Actions = &actions
		items = append(items, resp)
	}

	return ListVehicles200JSONResponse{
		Items:      items,
		Total:      result.Total,
		Page:       result.Page,
		PageSize:   result.PageSize,
		TotalPages: result.TotalPages,
	}, nil
}

func (s *Server) GetVehicle(ctx context.Context, request GetVehicleRequestObject) (GetVehicleResponseObject, error) {
	vehicle, err := s.vehicleSvc.GetByID(ctx, uuid.UUID(request.Id))
	if err != nil {
		return GetVehicle500JSONResponse{
			Code:    http.StatusInternalServerError,
			Message: "Failed to retrieve vehicle",
		}, nil
	}
	if vehicle == nil {
		return GetVehicle404JSONResponse{
			Code:    http.StatusNotFound,
			Message: "Vehicle not found",
		}, nil
	}

	resp := modelVehicleToResponse(*vehicle)
	// Include actions in detail response
	actions := make([]VehicleAction, 0, len(vehicle.Actions))
	for _, a := range vehicle.Actions {
		actions = append(actions, modelActionToResponse(a))
	}
	resp.Actions = &actions

	return GetVehicle200JSONResponse(resp), nil
}

func (s *Server) ListVehicleActions(ctx context.Context, request ListVehicleActionsRequestObject) (ListVehicleActionsResponseObject, error) {
	actions, err := s.actionSvc.ListByVehicleID(ctx, uuid.UUID(request.Id))
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return ListVehicleActions404JSONResponse{
				Code:    http.StatusNotFound,
				Message: "Vehicle not found",
			}, nil
		}
		return ListVehicleActions500JSONResponse{
			Code:    http.StatusInternalServerError,
			Message: "Failed to retrieve vehicle actions",
		}, nil
	}

	resp := make(ListVehicleActions200JSONResponse, 0, len(actions))
	for _, a := range actions {
		resp = append(resp, modelActionToResponse(a))
	}
	return resp, nil
}

func (s *Server) CreateVehicleAction(ctx context.Context, request CreateVehicleActionRequestObject) (CreateVehicleActionResponseObject, error) {
	if request.Body == nil {
		return CreateVehicleAction400JSONResponse{
			Code:    http.StatusBadRequest,
			Message: "Request body is required",
		}, nil
	}

	input := models.CreateActionInput{
		ActionType: string(request.Body.ActionType),
		CreatedBy:  request.Body.CreatedBy,
	}
	if request.Body.Notes != nil {
		input.Notes = *request.Body.Notes
	}

	action, err := s.actionSvc.Create(ctx, uuid.UUID(request.Id), input)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return CreateVehicleAction404JSONResponse{
				Code:    http.StatusNotFound,
				Message: "Vehicle not found",
			}, nil
		}
		if isValidationError(err) {
			return CreateVehicleAction400JSONResponse{
				Code:    http.StatusBadRequest,
				Message: err.Error(),
			}, nil
		}
		return CreateVehicleAction500JSONResponse{
			Code:    http.StatusInternalServerError,
			Message: "Failed to create vehicle action",
		}, nil
	}

	resp := modelActionToResponse(*action)
	return CreateVehicleAction201JSONResponse(resp), nil
}

func (s *Server) GetDashboardSummary(ctx context.Context, _ GetDashboardSummaryRequestObject) (GetDashboardSummaryResponseObject, error) {
	summary, err := s.dashboardSvc.GetSummary(ctx)
	if err != nil {
		return GetDashboardSummary500JSONResponse{
			Code:    http.StatusInternalServerError,
			Message: "Failed to retrieve dashboard summary",
		}, nil
	}

	byMake := make([]MakeSummary, 0, len(summary.ByMake))
	for _, ms := range summary.ByMake {
		byMake = append(byMake, MakeSummary{
			Make:       ms.Make,
			Count:      ms.Count,
			AgingCount: ms.AgingCount,
		})
	}

	byStatus := make([]StatusSummary, 0, len(summary.ByStatus))
	for _, ss := range summary.ByStatus {
		byStatus = append(byStatus, StatusSummary{
			Status: ss.Status,
			Count:  ss.Count,
		})
	}

	return GetDashboardSummary200JSONResponse{
		TotalVehicles:      summary.TotalVehicles,
		AgingVehicles:      summary.AgingVehicles,
		AverageDaysInStock: summary.AvgDaysInStock,
		ActionsThisMonth:   summary.ActionsThisMonth,
		ByMake:             byMake,
		ByStatus:           byStatus,
	}, nil
}

func (s *Server) ListRecentActions(ctx context.Context, request ListRecentActionsRequestObject) (ListRecentActionsResponseObject, error) {
	limit := 10
	if request.Params.Limit != nil {
		limit = *request.Params.Limit
	}

	filter := models.RecentActionsFilter{Limit: limit}
	if request.Params.DealershipId != nil {
		id := uuid.UUID(*request.Params.DealershipId)
		filter.DealershipID = &id
	}

	actions, err := s.actionSvc.ListRecent(ctx, filter)
	if err != nil {
		if strings.Contains(err.Error(), "limit must be between") {
			return ListRecentActions400JSONResponse{
				Code:    http.StatusBadRequest,
				Message: err.Error(),
			}, nil
		}
		return ListRecentActions500JSONResponse{
			Code:    http.StatusInternalServerError,
			Message: "Failed to retrieve recent actions",
		}, nil
	}

	resp := make(ListRecentActions200JSONResponse, 0, len(actions))
	for _, a := range actions {
		ra := RecentAction{
			Id:           a.ID,
			VehicleId:    a.VehicleID,
			VehicleMake:  a.VehicleMake,
			VehicleModel: a.VehicleModel,
			VehicleYear:  a.VehicleYear,
			DaysInStock:  a.DaysInStock,
			ActionType:   RecentActionActionType(a.ActionType),
			CreatedBy:    a.CreatedBy,
			CreatedAt:    a.CreatedAt,
		}
		if a.Notes != "" {
			notes := a.Notes
			ra.Notes = &notes
		}
		resp = append(resp, ra)
	}
	return resp, nil
}

// --- Helper functions ---

func paramsToFilters(p ListVehiclesParams) models.VehicleFilters {
	f := models.VehicleFilters{}
	if p.DealershipId != nil {
		id := uuid.UUID(*p.DealershipId)
		f.DealershipID = &id
	}
	if p.Make != nil {
		f.Make = *p.Make
	}
	if p.Model != nil {
		f.Model = *p.Model
	}
	if p.Status != nil {
		f.Status = string(*p.Status)
	}
	if p.Aging != nil {
		f.Aging = p.Aging
	}
	if p.SortBy != nil {
		f.SortBy = string(*p.SortBy)
	}
	if p.Order != nil {
		f.Order = string(*p.Order)
	}
	if p.Page != nil {
		f.Page = *p.Page
	}
	if p.PageSize != nil {
		f.PageSize = *p.PageSize
	}
	return f
}

func modelVehicleToResponse(v models.Vehicle) Vehicle {
	days := v.DaysInStock
	aging := v.IsAging
	resp := Vehicle{
		Id:           v.ID,
		DealershipId: v.DealershipID,
		Make:         v.Make,
		Model:        v.Model,
		Year:         v.Year,
		Vin:          v.VIN,
		Price:        v.Price,
		Status:       VehicleStatus(v.Status),
		StockedAt:    v.StockedAt,
		DaysInStock:  &days,
		IsAging:      &aging,
		CreatedAt:    v.CreatedAt,
		UpdatedAt:    v.UpdatedAt,
	}
	return resp
}

func modelActionToResponse(a models.VehicleAction) VehicleAction {
	resp := VehicleAction{
		Id:         a.ID,
		VehicleId:  a.VehicleID,
		ActionType: VehicleActionActionType(a.ActionType),
		CreatedBy:  a.CreatedBy,
		CreatedAt:  a.CreatedAt,
	}
	if a.Notes != "" {
		notes := a.Notes
		resp.Notes = &notes
	}
	return resp
}

// isValidationError checks if an error is a validation error (not a system error).
func isValidationError(err error) bool {
	msg := err.Error()
	// Vehicle action validation
	if strings.Contains(msg, "action_type") ||
		strings.Contains(msg, "created_by") ||
		strings.Contains(msg, "notes") {
		return true
	}
	// Vehicle creation validation
	validationPrefixes := []string{
		"make must", "model must", "year must", "VIN must",
		"price cannot", "status must", "stocked date cannot",
		"dealership not found",
	}
	for _, prefix := range validationPrefixes {
		if strings.HasPrefix(msg, prefix) {
			return true
		}
	}
	return false
}

func (s *Server) CreateVehicle(ctx context.Context, request CreateVehicleRequestObject) (CreateVehicleResponseObject, error) {
	body := request.Body

	// Map OpenAPI request to service input
	input := models.CreateVehicleInput{
		Make:   body.Make,
		Model:  body.Model,
		Year:   body.Year,
		VIN:    body.Vin,
		Status: string(body.Status),
	}

	// Parse dealership_id UUID
	dealershipID, err := uuid.Parse(body.DealershipId.String())
	if err != nil {
		return CreateVehicle400JSONResponse{Code: 400, Message: "invalid dealership_id"}, nil
	}
	input.DealershipID = dealershipID

	// Optional price
	if body.Price != nil {
		p := *body.Price
		input.Price = &p
	}

	// Optional stocked_at
	if body.StockedAt != nil {
		input.StockedAt = *body.StockedAt
	}

	vehicle, err := s.vehicleSvc.Create(ctx, input)
	if err != nil {
		if errors.Is(err, repository.ErrDuplicateVIN) {
			return CreateVehicle409JSONResponse{Code: 409, Message: "A vehicle with this VIN already exists"}, nil
		}
		if isValidationError(err) {
			return CreateVehicle400JSONResponse{Code: 400, Message: err.Error()}, nil
		}
		return CreateVehicle500JSONResponse{Code: 500, Message: "Failed to create vehicle"}, nil
	}

	resp := modelVehicleToResponse(*vehicle)
	return CreateVehicle201JSONResponse(resp), nil
}

func (s *Server) ExportVehicles(ctx context.Context, request ExportVehiclesRequestObject) (ExportVehiclesResponseObject, error) {
	filters := exportParamsToFilters(request.Params)

	csvBytes, err := s.vehicleSvc.ExportCSV(ctx, filters)
	if err != nil {
		if strings.Contains(err.Error(), "export exceeds") {
			return ExportVehicles400JSONResponse{Code: 400, Message: err.Error()}, nil
		}
		return ExportVehicles500JSONResponse{Code: 500, Message: "Failed to generate export"}, nil
	}

	filename := fmt.Sprintf("vehicles-export-%s.csv", time.Now().UTC().Format("2006-01-02"))
	return exportCSVResponse{
		data:     csvBytes,
		filename: filename,
	}, nil
}

// exportCSVResponse is a custom response that sets Content-Disposition header.
type exportCSVResponse struct {
	data     []byte
	filename string
}

func (r exportCSVResponse) VisitExportVehiclesResponse(w http.ResponseWriter) error {
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", r.filename))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(r.data)))
	w.WriteHeader(http.StatusOK)
	_, err := w.Write(r.data)
	return err
}

func exportParamsToFilters(p ExportVehiclesParams) models.VehicleFilters {
	filters := models.VehicleFilters{
		SortBy: "stocked_at",
		Order:  "desc",
	}
	if p.DealershipId != nil {
		id := uuid.UUID(*p.DealershipId)
		filters.DealershipID = &id
	}
	if p.Make != nil {
		filters.Make = *p.Make
	}
	if p.Model != nil {
		filters.Model = *p.Model
	}
	if p.Status != nil {
		filters.Status = string(*p.Status)
	}
	if p.Aging != nil {
		filters.Aging = p.Aging
	}
	if p.SortBy != nil {
		filters.SortBy = string(*p.SortBy)
	}
	if p.Order != nil {
		filters.Order = string(*p.Order)
	}
	return filters
}
