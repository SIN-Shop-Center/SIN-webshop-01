# Graph Report - SIN-webshop-01  (2026-07-28)

## Corpus Check
- 531 files · ~252,909 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1503 nodes · 2156 edges · 46 communities detected
- Extraction: 83% EXTRACTED · 17% INFERRED · 0% AMBIGUOUS · INFERRED: 364 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 65|Community 65]]

## God Nodes (most connected - your core abstractions)
1. `_api_call()` - 79 edges
2. `_api_call()` - 79 edges
3. `_out()` - 76 edges
4. `createAdminClient()` - 67 edges
5. `createClient()` - 36 edges
6. `requireAdmin()` - 26 edges
7. `isCronAuthorized()` - 16 edges
8. `checkRateLimit()` - 14 edges
9. `createPublicAdminClient()` - 14 edges
10. `createDataClient()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `createServiceClient()` --calls--> `createClient()`  [INFERRED]
  platform/workers/edge/functions/_shared/supabase.ts → src/lib/supabase/server.ts
- `main()` --calls--> `createAdminClient()`  [INFERRED]
  tooling/tests/integration/debug-race.ts → src/lib/supabase/admin.ts
- `persistCandidates()` --calls--> `createClient()`  [INFERRED]
  tooling/scripts/pipeline/trend-intelligence.mjs → src/lib/supabase/server.ts
- `seedProducts()` --calls--> `createClient()`  [INFERRED]
  tooling/scripts/supabase/seed-products.mjs → src/lib/supabase/server.ts
- `createSecretSyncMcpServer()` --calls--> `createSPMStore()`  [INFERRED]
  platform/workers/spm-secret-sync-mcp/src/server.mjs → packages/spm-core/src/store.mjs

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (155): _api_call(), cj_auth_get_token(), cj_auth_logout(), cj_auth_refresh_token(), cj_balance_get(), cj_balance_pay(), cj_balance_pay_v2(), cj_cogs_query() (+147 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (70): retryFulfillment(), getAdminOrders(), getAdminProducts(), getAdminStats(), retryCjForwarding(), toggleFeatured(), subscribeBackInStock(), assertQuery() (+62 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (86): _api_call(), _build_order_body(), build_parser(), cmd_auth_get_token(), cmd_auth_logout(), cmd_auth_refresh_token(), cmd_balance_get(), cmd_balance_pay() (+78 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (59): appendCandidate(), hasFlag(), loadEnvFile(), loadLocalEnvFiles(), localEnvCandidates(), readArgValue(), batchUpdateGoogleDocument(), fetchGoogleDocument() (+51 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (43): deleteAddress(), listAddresses(), saveAddress(), updateEmail(), updateProfile(), submitContactForm(), appUrl(), subscribeNewsletter() (+35 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (41): cleanupExpiredExports(), GET(), getCheapestFreight(), GET(), createCjOrder(), getCjOrderDetail(), GET(), calcPrice() (+33 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (33): getWishlist(), toggleWishlist(), NotFound(), HomePage(), CategoryNav(), resolveOrderStatus(), getActiveOrderStep(), PopularCategories() (+25 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (37): addToCart(), getCartCount(), getCartId(), getCartItems(), getCartItemsWithProducts(), getOrCreateCartId(), removeFromCart(), updateCartQuantity() (+29 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (27): createFileBackend(), keyBufferFromEnv(), createKeychainBackend(), buildSpmSpaceBundle(), copyFile(), copyTree(), createOrUpdateSpace(), ensureMasterKey() (+19 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (29): POST(), trackingUrl(), validSignature(), itemsTable(), fetchOrder(), logEmail(), sendOrderConfirmation(), sendOrderDelivered() (+21 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (13): bearerToken(), requireAdmin(), resolveUserId(), loadEdgeEnv(), optional(), parseAllowlist(), required(), corsHeaders() (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.19
Nodes (24): bootstrapLocalNlmProfile(), buildNlmEnv(), countCitations(), ensureMandatoryQueries(), ensureNlmAvailable(), ensureNlmLogin(), ensureNoBlockedDocDrift(), ensureNotebookBinding() (+16 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (13): attachSecretSyncMcpHttpRoutes(), createAgentCard(), createSecretSyncMcpHttpApp(), createSecretSyncMcpServer(), createSpmServer(), extractTextFromMessage(), main(), parseUserCommandText() (+5 more)

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (20): aggregateInventory(), calculateRetail(), cj(), clamp(), collectImages(), complianceRisk(), ensureCjSupplier(), evaluateProduct() (+12 more)

### Community 15 - "Community 15"
Cohesion: 0.27
Nodes (17): absoluteProjectPath(), buildBrief(), collectCheckpointSummary(), compactArtifact(), fileExists(), formatDate(), initializeProject(), main() (+9 more)

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (14): adminRedirect(), appOrigin(), GET(), safeNextPath(), statesMatch(), exchangeAuthCode(), getShopCipher(), getTikTokToken() (+6 more)

### Community 17 - "Community 17"
Cohesion: 0.24
Nodes (16): claimJob(), completeStage(), createPipelineRun(), createStageRun(), executeStage(), failStage(), main(), markJobCompleted() (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.22
Nodes (12): clamp(), commerceFit(), decodeXml(), dedupeAndRank(), loadBrowserOutput(), main(), normalizeCandidate(), normalizedScore() (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (13): chunkPlan(), contentTypeFor(), createOrResetLedger(), eligibleCreativeJobs(), fetchUploadStatus(), initializeUpload(), main(), mapRemoteStatus() (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.3
Nodes (13): calculateQuality(), extractResponseText(), main(), mapVariants(), persistProduct(), productUuid(), publishBlockers(), researchProduct() (+5 more)

### Community 21 - "Community 21"
Cohesion: 0.27
Nodes (8): fail(), parseURL(), requireValue(), validateBoolean(), validateEmail(), validateFromAddress(), validateNoPlaceholder(), valueOf()

### Community 22 - "Community 22"
Cohesion: 0.41
Nodes (11): asArray(), buildChannelPost(), buildOpportunityDraft(), hash(), main(), publishedProducts(), readOpportunities(), sellingPoints() (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.27
Nodes (7): agentCard(), buildPlan(), oauthClient(), handleRequest(), readJson(), requestBaseUrl(), sendJson()

### Community 24 - "Community 24"
Cohesion: 0.42
Nodes (7): calcPrice(), cj(), collectImages(), getEuStock(), getToken(), importProduct(), mapVariant()

### Community 25 - "Community 25"
Cohesion: 0.39
Nodes (6): generate(), svgIcon(), main(), mkdir(), parseArgs(), writeIfAllowed()

### Community 26 - "Community 26"
Cohesion: 0.33
Nodes (4): applyFixture(), testDatabaseUrl(), globalSetup(), globalTeardown()

### Community 27 - "Community 27"
Cohesion: 0.38
Nodes (4): calcPrice(), cj(), getToken(), mapVariant()

### Community 28 - "Community 28"
Cohesion: 0.4
Nodes (2): normalizeAbsoluteSiteUrl(), resolveWebProductionEnv()

### Community 30 - "Community 30"
Cohesion: 0.6
Nodes (5): applyUnsubscribe(), confirmationPage(), GET(), POST(), tokenHash()

### Community 31 - "Community 31"
Cohesion: 0.4
Nodes (3): blur(), validateAddress(), submit()

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (2): fetchWithTimeout(), waitUntilReady()

### Community 34 - "Community 34"
Cohesion: 0.4
Nodes (2): ExitIntentOffer(), useFocusTrap()

### Community 35 - "Community 35"
Cohesion: 0.5
Nodes (2): arm(), onConsent()

### Community 36 - "Community 36"
Cohesion: 0.83
Nodes (3): get_variants(), main(), ssh_cmd()

### Community 39 - "Community 39"
Cohesion: 0.83
Nodes (3): getCjToken(), main(), searchCjProducts()

### Community 40 - "Community 40"
Cohesion: 0.5
Nodes (2): proxy(), updateSession()

### Community 41 - "Community 41"
Cohesion: 0.67
Nodes (2): addressText(), ShippingAddress()

### Community 47 - "Community 47"
Cohesion: 0.67
Nodes (2): DeliveryEstimate(), getEstimatedDelivery()

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (2): main(), parseJsonWithTrailingCommaSupport()

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (2): _clean_singletons(), main()

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (2): _clean_singletons(), main()

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (2): _clean_singletons(), main()

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (2): main(), translate()

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (2): main(), translate()

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (2): build_audit(), main()

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (2): formatSold(), getProductBadges()

## Knowledge Gaps
- **74 isolated node(s):** `Get a new CJ access token using the API key. Tokens are cached automatically.`, `Refresh the CJ access token using the cached refresh token.`, `Logout and invalidate the current access token and refresh token.`, `Get account settings including profile, API quota limits, QPS limits, sandbox st`, `Get all product categories from CJ (3-level hierarchy: first > second > third wi` (+69 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 28`** (6 nodes): `normalizeAbsoluteSiteUrl()`, `resolveWebProductionEnv()`, `fail()`, `web-production-env.mjs`, `web-production-env.test.mjs`, `with-web-production-env.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (5 nodes): `fetchWithTimeout()`, `precondition()`, `stopServer()`, `waitUntilReady()`, `check-web-runtime.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (5 nodes): `ExitIntentOffer()`, `getFocusableElements()`, `useFocusTrap()`, `exit-intent-offer.tsx`, `use-focus-trap.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (5 nodes): `arm()`, `dismiss()`, `hasConsent()`, `onConsent()`, `newsletter-capture.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (4 nodes): `middleware.ts`, `proxy()`, `proxy.ts`, `updateSession()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (4 nodes): `addressText()`, `OrderShipping()`, `ShippingAddress()`, `order-shipping.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (4 nodes): `apply()`, `DeliveryEstimate()`, `getEstimatedDelivery()`, `cart-summary-sections.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (3 nodes): `main()`, `parseJsonWithTrailingCommaSupport()`, `install-opencode-sin-a2a.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (3 nodes): `_clean_singletons()`, `main()`, `open_supabase_login.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (3 nodes): `_clean_singletons()`, `main()`, `step_login_headed.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (3 nodes): `_clean_singletons()`, `main()`, `step_extract_pat.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (3 nodes): `main()`, `translate()`, `translate-products-cf.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (3 nodes): `main()`, `translate()`, `translate-products.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (3 nodes): `build_audit()`, `main()`, `automator.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (3 nodes): `formatSold()`, `getProductBadges()`, `product-badges.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Community 4` to `Community 1`, `Community 6`, `Community 7`, `Community 10`, `Community 16`, `Community 18`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `Community 1` to `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 9`, `Community 16`, `Community 30`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `persistCandidates()` connect `Community 18` to `Community 4`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Are the 66 inferred relationships involving `createAdminClient()` (e.g. with `main()` and `sitemap()`) actually correct?**
  _`createAdminClient()` has 66 INFERRED edges - model-reasoned connections that need verification._
- **Are the 35 inferred relationships involving `createClient()` (e.g. with `main()` and `persistCandidates()`) actually correct?**
  _`createClient()` has 35 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Get a new CJ access token using the API key. Tokens are cached automatically.`, `Refresh the CJ access token using the cached refresh token.`, `Logout and invalidate the current access token and refresh token.` to the rest of the system?**
  _74 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._