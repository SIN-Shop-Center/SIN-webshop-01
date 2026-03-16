package http

import (
	"github.com/gin-gonic/gin"
	"simone-webshop/apps/api/internal/admin"
	"simone-webshop/apps/api/internal/ai"
	"simone-webshop/apps/api/internal/http/middleware"
)

func registerAdminRoutes(api *gin.RouterGroup, authn *middleware.Authenticator, adminH *admin.Handler, aiH *ai.Handler) {
	api.POST("/admin/suppliers/onboarding/callback", adminH.SupplierOnboardingCallback)
	api.POST("/admin/suppliers/catalog-sync/callback", adminH.SupplierCatalogSyncCallback)
	api.GET("/admin/channels/tiktok/connect/callback", adminH.TikTokConnectCallback)
	api.POST("/admin/channels/tiktok/connect/browser-metadata/callback", adminH.TikTokConnectBrowserMetadataCallback)

	adminG := api.Group("/admin", authn.Middleware(), middleware.RequireRoles("admin", "ops"))
	adminG.Use(middleware.AuditMutations("admin"))

	registerAdminCustomerRoutes(adminG, adminH)
	registerAdminCatalogRoutes(adminG, adminH)
	registerAdminContentRoutes(adminG, adminH)
	registerAdminOpsRoutes(adminG, adminH, aiH)
}

func registerAdminCustomerRoutes(adminG *gin.RouterGroup, adminH *admin.Handler) {
	adminG.GET("/customers", adminH.ListCustomers)
	adminG.POST("/customers", adminH.CreateCustomer)
	adminG.GET("/customers/:id", adminH.GetCustomer)
	adminG.PUT("/customers/:id", adminH.UpdateCustomer)
	adminG.PATCH("/customers/:id", adminH.UpdateCustomer)
	adminG.DELETE("/customers/:id", adminH.DeleteCustomer)
}

func registerAdminCatalogRoutes(adminG *gin.RouterGroup, adminH *admin.Handler) {
	adminG.GET("/products", adminH.ListProducts)
	adminG.POST("/products", adminH.CreateProduct)
	adminG.GET("/products/:id", adminH.GetProduct)
	adminG.PUT("/products/:id", adminH.UpdateProduct)
	adminG.PATCH("/products/:id", adminH.UpdateProduct)
	adminG.DELETE("/products/:id", adminH.DeleteProduct)

	adminG.GET("/suppliers", adminH.ListSuppliers)
	adminG.POST("/suppliers", adminH.CreateSupplier)
	adminG.GET("/suppliers/:id", adminH.GetSupplier)
	adminG.GET("/suppliers/:id/performance", adminH.GetSupplierPerformance)
	adminG.PUT("/suppliers/:id", adminH.UpdateSupplier)
	adminG.PATCH("/suppliers/:id", adminH.UpdateSupplier)
	adminG.DELETE("/suppliers/:id", adminH.DeleteSupplier)
	adminG.GET("/suppliers/:id/credentials", adminH.GetSupplierCredentials)
	adminG.PUT("/suppliers/:id/credentials", adminH.UpsertSupplierCredentials)
	adminG.GET("/suppliers/:id/catalog-products", adminH.ListSupplierCatalogProducts)
	adminG.PUT("/suppliers/:id/catalog-products", adminH.UpsertSupplierCatalogProducts)
	adminG.POST("/suppliers/:id/catalog-products/sync", adminH.TriggerSupplierCatalogSync)
	adminG.POST("/suppliers/:id/catalog-products/:catalog_id/import", adminH.ImportSupplierCatalogProduct)
	adminG.GET("/suppliers/:id/product-mappings", adminH.ListSupplierProductMappings)
	adminG.PUT("/suppliers/:id/product-mappings", adminH.ReplaceSupplierProductMappings)
	adminG.GET("/suppliers/:id/contracts", adminH.ListSupplierContracts)
	adminG.POST("/suppliers/:id/contracts", adminH.CreateSupplierContract)
	adminG.POST("/suppliers/:id/contracts/presign", adminH.PresignSupplierContractUpload)
	adminG.GET("/suppliers/:id/contracts/:contract_id/download-url", adminH.GetSupplierContractDownloadURL)
	adminG.GET("/suppliers/:id/communications", adminH.ListSupplierCommunications)
	adminG.POST("/suppliers/:id/communications", adminH.CreateSupplierCommunication)
	adminG.GET("/suppliers/:id/audit-log", adminH.ListSupplierAuditLog)
	adminG.GET("/suppliers/:id/onboarding/runs", adminH.ListSupplierOnboardingRuns)
	adminG.GET("/suppliers/:id/api-keys", adminH.ListSupplierAPIKeys)
	adminG.POST("/suppliers/:id/api-keys", adminH.CreateSupplierAPIKey)
	adminG.POST("/suppliers/:id/api-keys/:key_id/revoke", adminH.RevokeSupplierAPIKey)
	adminG.POST("/suppliers/:id/webhooks/test-inbound", adminH.TestSupplierWebhookInbound)
	adminG.POST("/suppliers/:id/webhooks/test-outbound", adminH.TestSupplierWebhookOutbound)
	adminG.POST("/suppliers/:id/onboarding/runs", adminH.CreateSupplierOnboardingRun)
	adminG.GET("/suppliers/:id/onboarding/runs/:run_id", adminH.GetSupplierOnboardingRun)
	adminG.PATCH("/suppliers/:id/onboarding/runs/:run_id", adminH.PatchSupplierOnboardingRun)

	adminG.GET("/categories", adminH.ListCategories)
	adminG.POST("/categories", adminH.CreateCategory)
	adminG.GET("/categories/:id", adminH.GetCategory)
	adminG.PUT("/categories/:id", adminH.UpdateCategory)
	adminG.PATCH("/categories/:id", adminH.UpdateCategory)
	adminG.DELETE("/categories/:id", adminH.DeleteCategory)
}

func registerAdminContentRoutes(adminG *gin.RouterGroup, adminH *admin.Handler) {
	adminG.GET("/pages", adminH.ListPages)
	adminG.POST("/pages", adminH.CreatePage)
	adminG.GET("/pages/:id", adminH.GetPage)
	adminG.PUT("/pages/:id", adminH.UpdatePage)
	adminG.PATCH("/pages/:id", adminH.UpdatePage)
	adminG.DELETE("/pages/:id", adminH.DeletePage)

	adminG.GET("/blog", adminH.ListBlogPosts)
	adminG.POST("/blog", adminH.CreateBlogPost)
	adminG.GET("/blog/:id", adminH.GetBlogPost)
	adminG.PUT("/blog/:id", adminH.UpdateBlogPost)
	adminG.PATCH("/blog/:id", adminH.UpdateBlogPost)
	adminG.DELETE("/blog/:id", adminH.DeleteBlogPost)

	adminG.GET("/promotions", adminH.ListPromotions)
	adminG.POST("/promotions", adminH.CreatePromotion)
	adminG.GET("/promotions/:id", adminH.GetPromotion)
	adminG.PUT("/promotions/:id", adminH.UpdatePromotion)
	adminG.PATCH("/promotions/:id", adminH.UpdatePromotion)
	adminG.DELETE("/promotions/:id", adminH.DeletePromotion)
}

func registerAdminOpsRoutes(adminG *gin.RouterGroup, adminH *admin.Handler, aiH *ai.Handler) {
	adminG.GET("/settings", adminH.GetSettings)
	adminG.PUT("/settings", adminH.UpdateSettings)
	adminG.PATCH("/settings", adminH.UpdateSettings)

	adminG.GET("/orders", adminH.ListOrders)
	adminG.GET("/orders/:id", adminH.GetOrder)
	adminG.PATCH("/orders/:id", adminH.PatchOrder)
	adminG.POST("/orders/:id/supplier-dispatch", adminH.TriggerSupplierDispatch)
	adminG.GET("/orders/:id/supplier-orders", adminH.ListOrderSupplierOrders)

	adminG.POST("/inventory/reorder/scan", adminH.TriggerInventoryReorderScan)

	adminG.GET("/automation/health", adminH.GetAutomationHealth)
	adminG.GET("/automation/policy", adminH.GetAutomationPolicy)
	adminG.PUT("/automation/policy", adminH.UpdateAutomationPolicy)

	adminG.GET("/trends/policy", adminH.GetTrendPolicy)
	adminG.PUT("/trends/policy", adminH.UpdateTrendPolicy)
	adminG.GET("/trends/candidates", adminH.ListTrendCandidates)
	adminG.POST("/trends/signals/ingest", adminH.IngestTrendSignals)
	adminG.POST("/trends/:id/approve", adminH.ApproveTrendCandidate)
	adminG.POST("/trends/:id/launch", adminH.LaunchTrendCandidate)
	adminG.GET("/trends/performance", adminH.GetTrendPerformance)

	adminG.GET("/growth/budget-policy", adminH.GetGrowthBudgetPolicy)
	adminG.PUT("/growth/budget-policy", adminH.UpdateGrowthBudgetPolicy)
	adminG.GET("/revenue/forecast-policy", adminH.GetRevenueForecastPolicy)
	adminG.PUT("/revenue/forecast-policy", adminH.UpdateRevenueForecastPolicy)
	adminG.GET("/revenue/forecast", adminH.GetRevenueForecast)

	adminG.GET("/channels", adminH.GetChannels)
	adminG.GET("/channels/:channel/health", adminH.GetChannelHealth)
	adminG.POST("/channels/:channel/metadata/refresh", adminH.RefreshChannelMetadata)
	adminG.GET("/channels/:channel/community/queue", adminH.GetChannelCommunityQueue)
	adminG.POST("/channels/:channel/community/replies", adminH.RequestChannelCommunityReply)
	adminG.GET("/channels/:channel/connect/sessions/:state_token", adminH.GetChannelConnectSession)
	adminG.POST("/channels/:channel/connect/start", adminH.StartChannelConnect)
	adminG.POST("/channels/:channel/connect/browser-metadata", adminH.RequestChannelConnectBrowserMetadata)
	adminG.POST("/channels/:channel/connect/complete", adminH.CompleteChannelConnect)
	adminG.POST("/channels/:channel/catalog/sync", adminH.TriggerChannelCatalogSync)
	adminG.POST("/channels/:channel/campaigns/publish", adminH.TriggerChannelCampaignPublish)
	adminG.POST("/channels/:channel/events/ingest", adminH.IngestChannelEvents)

	adminG.GET("/attribution/summary", adminH.GetAttributionSummary)
	adminG.GET("/kpi/scorecard", adminH.GetKPIScorecard)
	adminG.GET("/creatives", adminH.ListCreatives)
	adminG.POST("/creatives", adminH.CreateCreative)
	adminG.GET("/ugc/settings", adminH.GetUGCSettings)
	adminG.PUT("/ugc/settings", adminH.UpdateUGCSettings)
	adminG.GET("/ugc/person-assets", adminH.ListUGCPersonAssets)
	adminG.POST("/ugc/person-assets", adminH.CreateUGCPersonAsset)
	adminG.GET("/ugc/person-assets/:id/content", adminH.GetUGCPersonAssetContent)
	adminG.GET("/ugc/assets/person", adminH.ListUGCPersonAssets)
	adminG.POST("/ugc/assets/person", adminH.CreateUGCPersonAsset)
	adminG.GET("/ugc/jobs", adminH.ListUGCJobs)
	adminG.POST("/ugc/jobs", adminH.CreateUGCJob)
	adminG.GET("/ugc/jobs/:id", adminH.GetUGCJob)
	adminG.POST("/ugc/jobs/:id/retry", adminH.RetryUGCJob)
	adminG.GET("/ugc/posting-queue", adminH.ListUGCPostingQueue)
	adminG.POST("/ugc/posting-queue/claim", adminH.ClaimUGCPostingQueueItem)
	adminG.POST("/ugc/posting-queue/:id/posted", adminH.MarkUGCPostingQueuePosted)
	adminG.GET("/creators", adminH.ListCreators)
	adminG.POST("/creators", adminH.CreateCreator)
	adminG.GET("/affiliate/offers", adminH.ListAffiliateOffers)
	adminG.POST("/affiliate/offers", adminH.CreateAffiliateOffer)
	adminG.POST("/kill-switch/:domain", adminH.SetKillSwitch)

	adminG.GET("/ai/config", aiH.GetConfig)
	adminG.PUT("/ai/config", aiH.UpdateConfig)
	adminG.POST("/ai/test", aiH.TestProvider)

	adminG.GET("/crm/tasks", adminH.ListCRMTasks)
	adminG.POST("/crm/tasks", adminH.CreateCRMTask)
	adminG.PATCH("/crm/tasks/:id", adminH.PatchCRMTask)
	adminG.GET("/crm/activities", adminH.ListCRMActivities)
	adminG.POST("/crm/activities", adminH.CreateCRMActivity)
	adminG.GET("/crm/notes", adminH.ListCRMNotes)
	adminG.POST("/crm/notes", adminH.CreateCRMNote)
}
