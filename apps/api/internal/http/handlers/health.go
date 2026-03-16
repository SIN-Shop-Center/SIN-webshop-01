package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

type healthReadinessQuerier interface {
	Ping(ctx context.Context) error
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type HealthHandler struct {
	Pool healthReadinessQuerier
}

type commerceReadiness struct {
	ReadySuppliers int `json:"ready_suppliers"`
	ReadyProducts  int `json:"ready_products"`
	ActiveProducts int `json:"active_products"`
}

func (r commerceReadiness) Ready() bool {
	return r.ReadySuppliers > 0 && r.ReadyProducts > 0
}

func loadCommerceReadiness(ctx context.Context, q healthReadinessQuerier) (commerceReadiness, error) {
	const query = `
with ready_suppliers as (
  select distinct s.id
  from public.suppliers s
  where s.auto_fulfill_enabled = true
    and s.status in ('approved', 'active')
    and s.onboarding_status = 'connected'
    and s.compliance_state = 'approved'
    and (
      (
        coalesce(s.fulfillment_mode, 'email') = 'api'
        and coalesce(nullif(s.api_endpoint, ''), '') <> ''
        and coalesce(nullif(public.resolve_supplier_secret_ref(s.api_secret_ref), ''), nullif(s.api_key, ''), '') <> ''
      )
      or
      (
        coalesce(s.fulfillment_mode, 'email') = 'email'
        and coalesce(nullif(s.contact_email, ''), nullif(s.email, '')) <> ''
      )
    )
),
ready_products as (
  select distinct p.id
  from public.products p
  where p.is_active = true
    and exists (
      with supplier_candidates as (
        select ps.supplier_id
        from public.product_suppliers ps
        where ps.product_id = p.id
          and ps.is_active = true
        union
        select p.supplier_id
      )
      select 1
      from supplier_candidates sc
      join ready_suppliers rs on rs.id = sc.supplier_id
    )
),
active_products as (
  select count(*)::int as total
  from public.products p
  where p.is_active = true
)
select
  (select count(*)::int from ready_suppliers),
  (select count(*)::int from ready_products),
  (select total from active_products)
`

	var snapshot commerceReadiness
	err := q.QueryRow(ctx, query).Scan(&snapshot.ReadySuppliers, &snapshot.ReadyProducts, &snapshot.ActiveProducts)
	return snapshot, err
}

func (h *HealthHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "api"})
}

func (h *HealthHandler) Live(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "live"})
}

func (h *HealthHandler) Ready(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()
	if err := h.Pool.Ping(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "degraded", "error": err.Error()})
		return
	}
	commerce, err := loadCommerceReadiness(ctx, h.Pool)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "degraded", "error": "commerce_readiness_query_failed"})
		return
	}
	if !commerce.Ready() {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":   "degraded",
			"error":    "commerce_not_ready",
			"commerce": commerce,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ready", "commerce": commerce})
}
