package handler

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/khanh/intelligent-inventory-dashboard/backend/internal/models"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// --- Mock Services ---

type mockHealthService struct {
	status *models.HealthStatus
	err    error
}

func (m *mockHealthService) Check(_ context.Context) (*models.HealthStatus, error) {
	return m.status, m.err
}

type mockDealershipService struct {
	dealerships []models.Dealership
	err         error
}

func (m *mockDealershipService) List(_ context.Context) ([]models.Dealership, error) {
	return m.dealerships, m.err
}

type mockVehicleService struct {
	paginatedVehicles *models.PaginatedVehicles
	vehicle           *models.Vehicle
	listErr           error
	getErr            error
}

func (m *mockVehicleService) List(_ context.Context, _ models.VehicleFilters) (*models.PaginatedVehicles, error) {
	return m.paginatedVehicles, m.listErr
}

func (m *mockVehicleService) GetByID(_ context.Context, _ uuid.UUID) (*models.Vehicle, error) {
	return m.vehicle, m.getErr
}

func (m *mockVehicleService) Create(_ context.Context, _ models.CreateVehicleInput) (*models.Vehicle, error) {
	return nil, nil
}

func (m *mockVehicleService) ExportCSV(_ context.Context, _ models.VehicleFilters) ([]byte, error) {
	return nil, nil
}

type mockActionService struct {
	action    *models.VehicleAction
	actions   []models.VehicleAction
	createErr error
	listErr   error
}

func (m *mockActionService) Create(_ context.Context, _ uuid.UUID, _ models.CreateActionInput) (*models.VehicleAction, error) {
	return m.action, m.createErr
}

func (m *mockActionService) ListByVehicleID(_ context.Context, _ uuid.UUID) ([]models.VehicleAction, error) {
	return m.actions, m.listErr
}

type mockDashboardService struct {
	summary *models.DashboardSummary
	err     error
}

func (m *mockDashboardService) GetSummary(_ context.Context) (*models.DashboardSummary, error) {
	return m.summary, m.err
}

// --- Health Tests ---

func TestGetHealth_Healthy(t *testing.T) {
	srv := NewServer(
		&mockHealthService{status: &models.HealthStatus{Status: "healthy", Version: "1.0.0", Database: "connected", Uptime: "1m0s"}},
		nil, nil, nil, nil,
	)
	resp, err := srv.GetHealth(context.Background(), GetHealthRequestObject{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(GetHealth200JSONResponse); !ok {
		t.Errorf("expected GetHealth200JSONResponse, got %T", resp)
	}
}

func TestGetHealth_Unhealthy(t *testing.T) {
	srv := NewServer(
		&mockHealthService{status: &models.HealthStatus{Status: "unhealthy", Version: "1.0.0", Database: "disconnected", Uptime: "1m0s"}},
		nil, nil, nil, nil,
	)
	resp, err := srv.GetHealth(context.Background(), GetHealthRequestObject{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(GetHealth503JSONResponse); !ok {
		t.Errorf("expected GetHealth503JSONResponse, got %T", resp)
	}
}

func TestGetHealth_ServiceError(t *testing.T) {
	srv := NewServer(
		&mockHealthService{
			status: &models.HealthStatus{Status: "unhealthy", Database: "disconnected"},
			err:    errors.New("service error"),
		},
		nil, nil, nil, nil,
	)
	resp, err := srv.GetHealth(context.Background(), GetHealthRequestObject{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(GetHealth503JSONResponse); !ok {
		t.Errorf("expected GetHealth503JSONResponse, got %T", resp)
	}
}

// --- ListDealerships Tests ---

func TestListDealerships_Success(t *testing.T) {
	srv := NewServer(nil,
		&mockDealershipService{
			dealerships: []models.Dealership{
				{ID: uuid.New(), Name: "Test Dealer", Location: "NYC", CreatedAt: time.Now(), UpdatedAt: time.Now()},
			},
		},
		nil, nil, nil,
	)
	resp, err := srv.ListDealerships(context.Background(), ListDealershipsRequestObject{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	r, ok := resp.(ListDealerships200JSONResponse)
	if !ok {
		t.Fatalf("expected ListDealerships200JSONResponse, got %T", resp)
	}
	if len(r) != 1 {
		t.Errorf("expected 1 dealership, got %d", len(r))
	}
}

func TestListDealerships_ServiceError(t *testing.T) {
	srv := NewServer(nil,
		&mockDealershipService{err: errors.New("db error")},
		nil, nil, nil,
	)
	resp, err := srv.ListDealerships(context.Background(), ListDealershipsRequestObject{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(ListDealerships500JSONResponse); !ok {
		t.Errorf("expected ListDealerships500JSONResponse, got %T", resp)
	}
}

// --- ListVehicles Tests ---

func TestListVehicles_Success(t *testing.T) {
	price := 25000.0
	srv := NewServer(nil, nil,
		&mockVehicleService{
			paginatedVehicles: &models.PaginatedVehicles{
				Items: []models.Vehicle{
					{ID: uuid.New(), Make: "Honda", Model: "Civic", Year: 2023, VIN: "VIN123", Price: &price, Status: "available", StockedAt: time.Now(), DaysInStock: 30},
				},
				Total: 1, Page: 1, PageSize: 20, TotalPages: 1,
			},
		},
		nil, nil,
	)
	resp, err := srv.ListVehicles(context.Background(), ListVehiclesRequestObject{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	r, ok := resp.(ListVehicles200JSONResponse)
	if !ok {
		t.Fatalf("expected ListVehicles200JSONResponse, got %T", resp)
	}
	if len(r.Items) != 1 {
		t.Errorf("expected 1 vehicle, got %d", len(r.Items))
	}
	if r.Total != 1 {
		t.Errorf("expected total 1, got %d", r.Total)
	}
}

func TestListVehicles_ServiceError(t *testing.T) {
	srv := NewServer(nil, nil,
		&mockVehicleService{listErr: errors.New("db error")},
		nil, nil,
	)
	resp, err := srv.ListVehicles(context.Background(), ListVehiclesRequestObject{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(ListVehicles500JSONResponse); !ok {
		t.Errorf("expected ListVehicles500JSONResponse, got %T", resp)
	}
}

// --- GetVehicle Tests ---

func TestGetVehicle_Success(t *testing.T) {
	vid := uuid.New()
	srv := NewServer(nil, nil,
		&mockVehicleService{
			vehicle: &models.Vehicle{
				ID: vid, Make: "Honda", Model: "Civic", Year: 2023, VIN: "VIN123", Status: "available",
				StockedAt: time.Now(), DaysInStock: 30,
				Actions: []models.VehicleAction{
					{ID: uuid.New(), VehicleID: vid, ActionType: "price_reduction", CreatedBy: "Manager", CreatedAt: time.Now()},
				},
			},
		},
		nil, nil,
	)
	resp, err := srv.GetVehicle(context.Background(), GetVehicleRequestObject{Id: openapi_types.UUID(vid)})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	r, ok := resp.(GetVehicle200JSONResponse)
	if !ok {
		t.Fatalf("expected GetVehicle200JSONResponse, got %T", resp)
	}
	if r.Actions == nil || len(*r.Actions) != 1 {
		t.Errorf("expected 1 action, got %v", r.Actions)
	}
}

func TestGetVehicle_NotFound(t *testing.T) {
	srv := NewServer(nil, nil,
		&mockVehicleService{vehicle: nil},
		nil, nil,
	)
	resp, err := srv.GetVehicle(context.Background(), GetVehicleRequestObject{Id: openapi_types.UUID(uuid.New())})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(GetVehicle404JSONResponse); !ok {
		t.Errorf("expected GetVehicle404JSONResponse, got %T", resp)
	}
}

func TestGetVehicle_ServiceError(t *testing.T) {
	srv := NewServer(nil, nil,
		&mockVehicleService{getErr: errors.New("db error")},
		nil, nil,
	)
	resp, err := srv.GetVehicle(context.Background(), GetVehicleRequestObject{Id: openapi_types.UUID(uuid.New())})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(GetVehicle500JSONResponse); !ok {
		t.Errorf("expected GetVehicle500JSONResponse, got %T", resp)
	}
}

// --- ListVehicleActions Tests ---

func TestListVehicleActions_Success(t *testing.T) {
	vid := uuid.New()
	srv := NewServer(nil, nil, nil,
		&mockActionService{
			actions: []models.VehicleAction{
				{ID: uuid.New(), VehicleID: vid, ActionType: "price_reduction", CreatedBy: "Manager", CreatedAt: time.Now()},
			},
		},
		nil,
	)
	resp, err := srv.ListVehicleActions(context.Background(), ListVehicleActionsRequestObject{Id: openapi_types.UUID(vid)})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	r, ok := resp.(ListVehicleActions200JSONResponse)
	if !ok {
		t.Fatalf("expected ListVehicleActions200JSONResponse, got %T", resp)
	}
	if len(r) != 1 {
		t.Errorf("expected 1 action, got %d", len(r))
	}
}

func TestListVehicleActions_NotFound(t *testing.T) {
	srv := NewServer(nil, nil, nil,
		&mockActionService{listErr: errors.New("vehicle not found: some-id")},
		nil,
	)
	resp, err := srv.ListVehicleActions(context.Background(), ListVehicleActionsRequestObject{Id: openapi_types.UUID(uuid.New())})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(ListVehicleActions404JSONResponse); !ok {
		t.Errorf("expected ListVehicleActions404JSONResponse, got %T", resp)
	}
}

func TestListVehicleActions_ServiceError(t *testing.T) {
	srv := NewServer(nil, nil, nil,
		&mockActionService{listErr: errors.New("db error")},
		nil,
	)
	resp, err := srv.ListVehicleActions(context.Background(), ListVehicleActionsRequestObject{Id: openapi_types.UUID(uuid.New())})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(ListVehicleActions500JSONResponse); !ok {
		t.Errorf("expected ListVehicleActions500JSONResponse, got %T", resp)
	}
}

// --- CreateVehicleAction Tests ---

func TestCreateVehicleAction_Success(t *testing.T) {
	vid := uuid.New()
	actionType := CreateVehicleActionRequestActionTypePriceReduction
	body := &CreateVehicleActionRequest{ActionType: actionType, CreatedBy: "Manager"}
	srv := NewServer(nil, nil, nil,
		&mockActionService{
			action: &models.VehicleAction{
				ID: uuid.New(), VehicleID: vid, ActionType: "price_reduction",
				CreatedBy: "Manager", CreatedAt: time.Now(),
			},
		},
		nil,
	)
	resp, err := srv.CreateVehicleAction(context.Background(), CreateVehicleActionRequestObject{Id: openapi_types.UUID(vid), Body: body})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(CreateVehicleAction201JSONResponse); !ok {
		t.Errorf("expected CreateVehicleAction201JSONResponse, got %T", resp)
	}
}

func TestCreateVehicleAction_ValidationError(t *testing.T) {
	actionType := CreateVehicleActionRequestActionTypePriceReduction
	body := &CreateVehicleActionRequest{ActionType: actionType, CreatedBy: "Manager"}
	srv := NewServer(nil, nil, nil,
		&mockActionService{createErr: errors.New("invalid action_type: bad")},
		nil,
	)
	resp, err := srv.CreateVehicleAction(context.Background(), CreateVehicleActionRequestObject{Id: openapi_types.UUID(uuid.New()), Body: body})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(CreateVehicleAction400JSONResponse); !ok {
		t.Errorf("expected CreateVehicleAction400JSONResponse, got %T", resp)
	}
}

func TestCreateVehicleAction_VehicleNotFound(t *testing.T) {
	actionType := CreateVehicleActionRequestActionTypePriceReduction
	body := &CreateVehicleActionRequest{ActionType: actionType, CreatedBy: "Manager"}
	srv := NewServer(nil, nil, nil,
		&mockActionService{createErr: errors.New("vehicle not found: some-id")},
		nil,
	)
	resp, err := srv.CreateVehicleAction(context.Background(), CreateVehicleActionRequestObject{Id: openapi_types.UUID(uuid.New()), Body: body})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(CreateVehicleAction404JSONResponse); !ok {
		t.Errorf("expected CreateVehicleAction404JSONResponse, got %T", resp)
	}
}

func TestCreateVehicleAction_ServiceError(t *testing.T) {
	actionType := CreateVehicleActionRequestActionTypePriceReduction
	body := &CreateVehicleActionRequest{ActionType: actionType, CreatedBy: "Manager"}
	srv := NewServer(nil, nil, nil,
		&mockActionService{createErr: errors.New("database error")},
		nil,
	)
	resp, err := srv.CreateVehicleAction(context.Background(), CreateVehicleActionRequestObject{Id: openapi_types.UUID(uuid.New()), Body: body})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(CreateVehicleAction500JSONResponse); !ok {
		t.Errorf("expected CreateVehicleAction500JSONResponse, got %T", resp)
	}
}

func TestCreateVehicleAction_NilBody(t *testing.T) {
	srv := NewServer(nil, nil, nil, &mockActionService{}, nil)
	resp, err := srv.CreateVehicleAction(context.Background(), CreateVehicleActionRequestObject{Id: openapi_types.UUID(uuid.New()), Body: nil})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(CreateVehicleAction400JSONResponse); !ok {
		t.Errorf("expected CreateVehicleAction400JSONResponse, got %T", resp)
	}
}

func TestListVehicles_IncludesActions(t *testing.T) {
	vid := uuid.New()
	actionID := uuid.New()
	now := time.Now()
	price := 25000.0
	srv := NewServer(nil, nil,
		&mockVehicleService{
			paginatedVehicles: &models.PaginatedVehicles{
				Items: []models.Vehicle{
					{
						ID: vid, Make: "Honda", Model: "Civic", Year: 2023, VIN: "VIN123",
						Price: &price, Status: "available", StockedAt: now, DaysInStock: 30,
						Actions: []models.VehicleAction{
							{ID: actionID, VehicleID: vid, ActionType: "price_reduction", CreatedBy: "Manager", CreatedAt: now},
						},
					},
				},
				Total: 1, Page: 1, PageSize: 20, TotalPages: 1,
			},
		},
		nil, nil,
	)
	resp, err := srv.ListVehicles(context.Background(), ListVehiclesRequestObject{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	r, ok := resp.(ListVehicles200JSONResponse)
	if !ok {
		t.Fatalf("expected ListVehicles200JSONResponse, got %T", resp)
	}
	if len(r.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(r.Items))
	}
	item := r.Items[0]
	if item.Actions == nil {
		t.Fatal("expected Actions to be non-nil")
	}
	if len(*item.Actions) != 1 {
		t.Errorf("expected 1 action, got %d", len(*item.Actions))
	}
	if (*item.Actions)[0].Id != actionID {
		t.Errorf("expected action ID %v, got %v", actionID, (*item.Actions)[0].Id)
	}
}

// --- GetDashboardSummary Tests ---

func TestGetDashboardSummary_Success(t *testing.T) {
	srv := NewServer(nil, nil, nil, nil,
		&mockDashboardService{
			summary: &models.DashboardSummary{
				TotalVehicles: 50, AgingVehicles: 10, AvgDaysInStock: 45.5,
				ByMake:   []models.MakeSummary{{Make: "Honda", Count: 20, AgingCount: 5}},
				ByStatus: []models.StatusSummary{{Status: "available", Count: 40}},
			},
		},
	)
	resp, err := srv.GetDashboardSummary(context.Background(), GetDashboardSummaryRequestObject{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	r, ok := resp.(GetDashboardSummary200JSONResponse)
	if !ok {
		t.Fatalf("expected GetDashboardSummary200JSONResponse, got %T", resp)
	}
	if r.TotalVehicles != 50 {
		t.Errorf("expected 50 total vehicles, got %d", r.TotalVehicles)
	}
	if len(r.ByMake) != 1 {
		t.Errorf("expected 1 make summary, got %d", len(r.ByMake))
	}
}

func TestGetDashboardSummary_ServiceError(t *testing.T) {
	srv := NewServer(nil, nil, nil, nil,
		&mockDashboardService{err: errors.New("db error")},
	)
	resp, err := srv.GetDashboardSummary(context.Background(), GetDashboardSummaryRequestObject{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(GetDashboardSummary500JSONResponse); !ok {
		t.Errorf("expected GetDashboardSummary500JSONResponse, got %T", resp)
	}
}
