package middleware

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRequestID_GeneratesNew(t *testing.T) {
	handler := RequestID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := GetRequestID(r.Context())
		if id == "" {
			t.Error("expected request_id in context")
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Header().Get("X-Request-ID") == "" {
		t.Error("expected X-Request-ID header in response")
	}
}

func TestRequestID_UsesProvidedHeader(t *testing.T) {
	handler := RequestID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := GetRequestID(r.Context())
		if id != "custom-id-123" {
			t.Errorf("expected custom-id-123, got %s", id)
		}
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Request-ID", "custom-id-123")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Header().Get("X-Request-ID") != "custom-id-123" {
		t.Errorf("expected X-Request-ID to be custom-id-123, got %s", rr.Header().Get("X-Request-ID"))
	}
}

func TestLogger_LogsRequest(t *testing.T) {
	var buf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&buf, nil))

	handler := RequestID(Logger(logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})))

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	logOutput := buf.String()
	if !strings.Contains(logOutput, "request completed") {
		t.Error("expected log message 'request completed'")
	}
	if !strings.Contains(logOutput, `"method":"GET"`) {
		t.Error("expected method in log output")
	}
	if !strings.Contains(logOutput, `"path":"/health"`) {
		t.Error("expected path in log output")
	}
	if !strings.Contains(logOutput, `"status":200`) {
		t.Error("expected status in log output")
	}
	if !strings.Contains(logOutput, "duration_ms") {
		t.Error("expected duration_ms in log output")
	}
	if !strings.Contains(logOutput, "request_id") {
		t.Error("expected request_id in log output")
	}
}
