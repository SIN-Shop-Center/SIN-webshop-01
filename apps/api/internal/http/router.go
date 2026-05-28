package http

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"simone-webshop/apps/api/internal/account"
	"simone-webshop/apps/api/internal/admin"
	"simone-webshop/apps/api/internal/ai"
	"simone-webshop/apps/api/internal/analytics"
	"simone-webshop/apps/api/internal/cart"
	"simone-webshop/apps/api/internal/catalog"
	"simone-webshop/apps/api/internal/checkout"
	"simone-webshop/apps/api/internal/config"
	"simone-webshop/apps/api/internal/http/handlers"
	"simone-webshop/apps/api/internal/http/middleware"
	"simone-webshop/apps/api/internal/objectstore"
	"simone-webshop/apps/api/internal/orders"
	"simone-webshop/apps/api/internal/promotions"
	"simone-webshop/apps/api/internal/social"
	"simone-webshop/apps/api/internal/storefront"
	"simone-webshop/apps/api/internal/suppliers"
	"simone-webshop/apps/api/internal/support"
)

func NewRouter(cfg config.Config, pool *pgxpool.Pool) *gin.Engine {
	r := gin.New()
	r.Use(middleware.Recovery(), middleware.RequestID(), middleware.Logging(), middleware.CORS(cfg.CORSAllowlist))

	authn, err := middleware.NewAuthenticator(cfg)
	if err != nil {
		panic(err)
	}

	h := &handlers.HealthHandler{Pool: pool}
	r.GET("/health", h.Health)
	r.GET("/live", h.Live)
	r.GET("/ready", h.Ready)

	api := r.Group("/api/v1")
	analyticsH := analytics.NewHandler(pool)
	api.POST("/analytics/events", analyticsH.IngestEvent)

	analyticsRead := api.Group("/analytics", authn.Middleware(), middleware.RequireRoles("admin", "ops"))
	analyticsRead.GET("/funnel", analyticsH.Funnel)
	analyticsRead.GET("/alerts", analyticsH.Alerts)
	analyticsRead.GET("/experiments", analyticsH.Experiments)

	catalogH := catalog.NewHandler(pool)
	api.GET("/catalog/products", catalogH.ListProducts)
	api.GET("/catalog/products/:id", catalogH.GetProduct)
	api.GET("/catalog/categories", catalogH.ListCategories)

	promotionsH := promotions.NewHandler(pool)
	api.GET("/promotions/active", promotionsH.ListActive)

	cartH := cart.NewHandler(pool)
	cartG := api.Group("/cart", authn.Middleware(), middleware.RequireRoles("customer", "admin", "ops", "support"))
	cartG.POST("/items", middleware.RequireIdempotency(), cartH.AddItem)
	cartG.PATCH("/items/:sku", middleware.RequireIdempotency(), cartH.PatchItem)
	cartG.DELETE("/items/:sku", cartH.DeleteItem)

	checkoutH := checkout.NewHandler(pool, checkout.Options{
		StripeSecretKey:  cfg.StripeSecretKey,
		StripeWebhookKey: cfg.StripeWebhookKey,
		SiteURL:          cfg.SiteURL,
	})
	api.POST("/checkout/session", middleware.RequireIdempotency(), checkoutH.CreateSession)
	api.GET("/checkout/session-status", checkoutH.SessionStatus)
	api.POST("/webhooks/stripe", checkoutH.StripeWebhook)

	storefrontH := storefront.NewHandler(pool, storefront.Options{
		SiteURL:         cfg.SiteURL,
		StripeSecretKey: cfg.StripeSecretKey,
	})
	storeG := api.Group("/store")
	storeG.GET("/cart", storefrontH.GetCart)
	storeG.POST("/cart/items", storefrontH.AddCartItem)
	storeG.PATCH("/cart/items/:sku", storefrontH.PatchCartItem)
	storeG.DELETE("/cart/items/:sku", storefrontH.DeleteCartItem)
	storeG.DELETE("/cart", storefrontH.ClearCart)
	storeG.GET("/checkout/session", storefrontH.GetCheckoutSession)
	storeG.POST("/checkout/session", storefrontH.CreateCheckoutSession)
	storeG.GET("/orders/lookup", storefrontH.GetOrder)
	storeG.POST("/access-requests", storefrontH.CreateAccessRequest)

	ordersH := orders.NewHandler(pool)
	ordG := api.Group("/orders", authn.Middleware(), middleware.RequireRoles("customer", "admin", "ops", "support"))
	ordG.GET("", ordersH.ListOrders)
	ordG.GET("/:id", ordersH.GetOrder)

	accountH := account.NewHandler(pool)
	accountG := api.Group("/account", authn.Middleware(), middleware.RequireRoles("customer", "admin", "ops", "support"))
	accountG.GET("/me", accountH.GetMe)
	accountG.PATCH("/me", accountH.PatchMe)

	r2Client, err := objectstore.NewR2(context.Background(), objectstore.R2Config{
		AccountID:       cfg.R2AccountID,
		AccessKeyID:     cfg.R2AccessKeyID,
		SecretAccessKey: cfg.R2SecretAccessKey,
		Bucket:          cfg.R2Bucket,
		PresignTTL:      time.Duration(cfg.R2PresignTTLSeconds) * time.Second,
	})
	if err != nil {
		panic(err)
	}

	adminH := admin.NewHandler(pool, admin.Options{R2Client: r2Client})
	aiH := ai.NewHandler(pool, ai.Options{ProviderURL: cfg.OpenCodeURL, ProviderKey: cfg.OpenCodeAPIKey, Model: cfg.OpenCodeModel})
	socialH := social.NewHandler(pool)
	suppliersH := suppliers.NewHandler(pool, suppliers.Options{
		WebhookSecret: cfg.SupplierWebhookSecret,
	})
	supportH := support.NewHandler(pool)
	api.POST("/ai/chat", aiH.Chat)
	registerAdminRoutes(api, authn, adminH, aiH)

	automationG := api.Group("/automation", authn.Middleware(), middleware.RequireRoles("admin", "ops"))
	automationG.POST("/:target/run", socialH.Run)

	cronG := api.Group("/cron")
	cronG.POST("/cj/tracking-poll", cronAuth(cfg.CronSharedSecret, pool, "cj.tracking.poll"))
	cronG.POST("/cj/product-sync", cronAuth(cfg.CronSharedSecret, pool, "cj.product.sync"))
	cronG.GET("/cj/balance", cronAuth(cfg.CronSharedSecret, pool, "cj.balance.check"))

	registerSupportRoutes(api, authn, supportH)
	registerSupplierRoutes(api, suppliersH)

	return r
}

func cronAuth(sharedSecret string, pool *pgxpool.Pool, jobType string) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := strings.TrimSpace(c.GetHeader("X-Cron-Token"))
		if sharedSecret != "" && token != sharedSecret {
			c.JSON(401, gin.H{"error": "invalid_cron_token"})
			return
		}
		enqueueCronJob(pool, jobType)(c)
	}
}

func enqueueCronJob(pool *pgxpool.Pool, jobType string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var payload map[string]any
		if err := c.ShouldBindJSON(&payload); err != nil {
			payload = map[string]any{}
		}
		payload["triggered_by"] = "cron"
		payload["triggered_at"] = time.Now().UTC().Format(time.RFC3339)

		b, err := json.Marshal(payload)
		if err != nil {
			c.JSON(500, gin.H{"error": "marshal_failed"})
			return
		}

		var jobID string
		err = pool.QueryRow(c.Request.Context(), `
insert into shop.queue_jobs (queue_name, job_type, dedupe_key, payload, status)
values ('automation', $1, gen_random_uuid()::text, $2::jsonb, 'pending')
returning id::text
`, jobType, string(b)).Scan(&jobID)
		if err != nil {
			c.JSON(500, gin.H{"error": "enqueue_failed", "detail": err.Error()})
			return
		}
		c.JSON(200, gin.H{"status": "enqueued", "job_id": jobID, "job_type": jobType})
	}
}
