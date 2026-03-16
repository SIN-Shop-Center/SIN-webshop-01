package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type fakeHealthPool struct {
	pingErr    error
	row        pgx.Row
	queryCount int
}

func (f *fakeHealthPool) Ping(ctx context.Context) error {
	return f.pingErr
}

func (f *fakeHealthPool) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	f.queryCount++
	return f.row
}

type fakeRow struct {
	values []any
	err    error
}

func (r fakeRow) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	if len(dest) != len(r.values) {
		return errors.New("scan_destination_mismatch")
	}
	for index := range dest {
		target := reflect.ValueOf(dest[index])
		if target.Kind() != reflect.Pointer || target.IsNil() {
			return errors.New("scan_destination_invalid")
		}
		target.Elem().Set(reflect.ValueOf(r.values[index]))
	}
	return nil
}

func TestCommerceReadinessReady(t *testing.T) {
	snapshot := commerceReadiness{ReadySuppliers: 1, ReadyProducts: 2, ActiveProducts: 2}
	if !snapshot.Ready() {
		t.Fatalf("expected readiness snapshot to be ready")
	}
}

func TestCommerceReadinessNotReadyWithoutSupplier(t *testing.T) {
	snapshot := commerceReadiness{ReadySuppliers: 0, ReadyProducts: 2, ActiveProducts: 2}
	if snapshot.Ready() {
		t.Fatalf("expected readiness snapshot to be degraded")
	}
}

func TestReadyReturnsDegradedWhenPingFails(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/ready", nil)

	pool := &fakeHealthPool{pingErr: errors.New("db_down")}
	h := &HealthHandler{Pool: pool}
	h.Ready(ctx)

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", recorder.Code)
	}
	if pool.queryCount != 0 {
		t.Fatalf("expected no readiness query on ping failure, got %d", pool.queryCount)
	}
}

func TestReadyReturnsDegradedWhenCommerceNotReady(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/ready", nil)

	pool := &fakeHealthPool{
		row: fakeRow{values: []any{0, 0, 4}},
	}
	h := &HealthHandler{Pool: pool}
	h.Ready(ctx)

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", recorder.Code)
	}

	var payload struct {
		Status   string            `json:"status"`
		Error    string            `json:"error"`
		Commerce commerceReadiness `json:"commerce"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid json response, got %v", err)
	}
	if payload.Error != "commerce_not_ready" {
		t.Fatalf("expected commerce_not_ready, got %q", payload.Error)
	}
	if payload.Commerce.ReadyProducts != 0 || payload.Commerce.ReadySuppliers != 0 {
		t.Fatalf("expected zero ready commerce counts, got %+v", payload.Commerce)
	}
}

func TestReadyReturnsReadyWhenCommerceReady(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/ready", nil)

	pool := &fakeHealthPool{
		row: fakeRow{values: []any{1, 3, 3}},
	}
	h := &HealthHandler{Pool: pool}
	h.Ready(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var payload struct {
		Status   string            `json:"status"`
		Commerce commerceReadiness `json:"commerce"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid json response, got %v", err)
	}
	if payload.Status != "ready" {
		t.Fatalf("expected ready status, got %q", payload.Status)
	}
	if payload.Commerce.ReadySuppliers != 1 || payload.Commerce.ReadyProducts != 3 {
		t.Fatalf("unexpected commerce payload: %+v", payload.Commerce)
	}
}
