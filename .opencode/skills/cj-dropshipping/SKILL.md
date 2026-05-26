# CJ Dropshipping API Skill

Complete CJ Dropshipping API integration for the Delqhi webshop. 50+ endpoints covered via CLI and MCP.

## API Credentials

- **API Key**: `CJ5240573@api@d5d074918b1f434995c26af2fc932bb8`
- **Base URL**: `https://developers.cjdropshipping.com/api2.0/v1`
- **openId**: `37995`
- **Auth**: Access Token via `apiKey` → valid 15 days, Refresh Token 180 days

## Tools

### CLI (`tools/cj-cli.py`)
```bash
python3 tools/cj-cli.py <group> <subcommand> [options]
```
Auto-manages tokens (cached in `~/.cj-tokens.json`). Rate limits to 1 QPS. Auto-refreshes on 401.

### MCP Server (`tools/cj-mcp-server.py`)
All 50+ endpoints exposed as `cj_*` tools. Configure in opencode:
```json
{
  "mcpServers": {
    "cj-dropshipping": {
      "command": "python3",
      "args": ["tools/cj-mcp-server.py"],
      "cwd": "/Users/jeremy/dev/projects/family-projects/simone-webshop-01"
    }
  }
}
```

## Complete Endpoint Reference

### 1. Authentication (3 endpoints)
| # | Method | Path | CLI Command | MCP Tool |
|---|--------|------|-------------|----------|
| 1.1 | POST | `/authentication/getAccessToken` | `auth get-token` | `cj_auth_get_token` |
| 1.2 | POST | `/authentication/refreshAccessToken` | `auth refresh-token` | `cj_auth_refresh_token` |
| 1.3 | POST | `/authentication/logout` | `auth logout` | `cj_auth_logout` |

### 2. Settings (1 endpoint)
| # | Method | Path | CLI Command | MCP Tool |
|---|--------|------|-------------|----------|
| 2.1 | GET | `/setting/get` | `setting get` | `cj_setting_get` |

### 3. Products (18 endpoints)
| # | Method | Path | CLI Command | MCP Tool |
|---|--------|------|-------------|----------|
| 3.1 | GET | `/product/getCategory` | `product categories` | `cj_product_categories` |
| 3.2 | GET | `/product/listV2` | `product list-v2 --keyword KW` | `cj_product_list_v2` |
| 3.3 | GET | `/product/globalWarehouseList` | `product warehouses` | `cj_product_warehouses` |
| 3.4 | GET | `/product/list` | `product list` | `cj_product_list` |
| 3.5 | GET | `/product/detail` | `product detail --pid PID` | `cj_product_detail` |
| 3.6 | POST | `/product/addToMyProduct` | `product add --pid PID` | `cj_product_add` |
| 3.7 | GET | `/product/myProductList` | `product my-products` | `cj_product_my_products` |
| 3.8 | GET | `/product/variant/query` | `product variants --pid PID` | `cj_product_variants` |
| 3.9 | GET | `/product/variant/queryByVid` | `product variant-by-vid --vid VID` | `cj_product_variant_by_vid` |
| 3.10 | GET | `/product/stock/queryByVid` | `product stock --vid VID` | `cj_product_stock` |
| 3.11 | GET | `/product/stock/queryBySku` | `product stock-by-sku --sku SKU` | `cj_product_stock_by_sku` |
| 3.12 | GET | `/product/stock/queryByPid` | `product stock-by-pid --pid PID` | `cj_product_stock_by_pid` |
| 3.13 | GET | `/product/review/list` | `product reviews --pid PID` | `cj_product_reviews` |
| 3.14 | POST | `/product/sourcing/create` | `product sourcing-create` | `cj_product_sourcing_create` |
| 3.15 | POST | `/product/sourcing/query` | `product sourcing-query` | `cj_product_sourcing_query` |
| 3.16 | GET | `/product/connection/list` | `product connections` | `cj_product_connections` |
| 3.17 | POST | `/product/connection/create` | `product connect` | `cj_product_connect` |
| 3.18 | DELETE | `/product/connection/delete` | `product disconnect --pid PID` | `cj_product_disconnect` |
| 3.19 | POST | `/product/video/query` | `product videos --pid PID` | `cj_product_videos` |
| 3.20 | POST | `/product/imageSearch` | `product image-search` | `cj_product_image_search` |

### 4. Storage / Warehouse (7 endpoints)
| # | Method | Path | CLI Command | MCP Tool |
|---|--------|------|-------------|----------|
| 4.1 | GET | `/warehouse/detail` | `warehouse detail --id ID` | `cj_warehouse_detail` |
| 4.2 | POST | `/product/stock/privateInventory/querySpuPage` | `private-inventory spu-page` | `cj_private_inventory_spu_page` |
| 4.3 | POST | `/product/stock/privateInventory/querySkuListByProductId` | `private-inventory sku-list` | `cj_private_inventory_sku_list` |
| 4.4 | POST | `/product/stock/privateInventory/querySkuDetailPage` | `private-inventory sku-detail` | `cj_private_inventory_sku_detail` |
| 4.5 | POST | `/product/stock/privateInventory/querySkuDetailListBySku` | `private-inventory sku-batch` | `cj_private_inventory_sku_batch` |
| 4.6 | POST | `/product/stock/privateInventory/querySkuFlowByCondition` | `private-inventory sku-flow` | `cj_private_inventory_sku_flow` |
| 4.7 | POST | `/storehouseCenterWeb/syncStorehouseVideoRequests` | `private-inventory warehouse-pictures` | `cj_warehouse_order_pictures` |

### 5. Shopping / Orders (12 endpoints)
| # | Method | Path | CLI Command | MCP Tool |
|---|--------|------|-------------|----------|
| 5.1 | POST | `/shopping/order/createOrderV2` | `order create-v2` | `cj_order_create_v2` |
| 5.2 | POST | `/shopping/order/createOrderV3` | `order create-v3` | `cj_order_create_v3` |
| 5.3 | POST | `/shopping/order/addCart` | `order add-cart` | `cj_order_add_cart` |
| 5.4 | POST | `/shopping/order/addCartConfirm` | `order add-cart-confirm` | `cj_order_add_cart_confirm` |
| 5.5 | POST | `/shopping/order/saveGenerateParentOrder` | `order save-parent` | `cj_order_save_parent` |
| 5.6 | GET | `/shopping/order/list` | `order list` | `cj_order_list` |
| 5.7 | GET | `/shopping/order/getOrderDetail` | `order detail --order-id ID` | `cj_order_detail` |
| 5.8 | DELETE | `/shopping/order/delete` | `order delete --order-id ID` | `cj_order_delete` |
| 5.9 | PATCH | `/shopping/order/confirm` | `order confirm --order-id ID` | `cj_order_confirm` |
| 5.10 | POST | `/shopping/order/changeWarehouse` | `order change-warehouse` | `cj_order_change_warehouse` |
| 5.11 | POST | `/shopping/order/sandboxPay` | `order sandbox-pay` | `cj_order_sandbox_pay` |
| 5.12 | POST | `/shopping/order/sandboxUpdateStatus` | `order sandbox-status` | `cj_order_sandbox_update_status` |

### 6. Payment / Balance (3 endpoints)
| # | Method | Path | CLI Command | MCP Tool |
|---|--------|------|-------------|----------|
| 6.1 | GET | `/shopping/pay/getBalance` | `balance get` | `cj_balance_get` |
| 6.2 | POST | `/shopping/pay/payBalance` | `balance pay --order-id ID` | `cj_balance_pay` |
| 6.3 | POST | `/shopping/pay/payBalanceV2` | `balance pay-v2` | `cj_balance_pay_v2` |

### 7. Shipping Info (3 endpoints)
| # | Method | Path | CLI Command | MCP Tool |
|---|--------|------|-------------|----------|
| 7.1 | POST | `/shopping/shipping/upload` | `shipping upload` | `cj_shipping_upload` |
| 7.2 | POST | `/shopping/shipping/update` | `shipping update` | `cj_shipping_update` |
| 7.3 | POST | `/shopping/shipping/updatePodPictures` | `shipping update-pod` | `cj_shipping_update_pod` |

### 8. COGS (1 endpoint)
| # | Method | Path | CLI Command | MCP Tool |
|---|--------|------|-------------|----------|
| 8.1 | POST | `/shopping/cogs/query` | `cogs query` | `cj_cogs_query` |

### 9. Merge Orders (6 endpoints)
| # | Method | Path | CLI Command | MCP Tool |
|---|--------|------|-------------|----------|
| 9.1 | POST | `/shopping/order/autoMatchMergeList` | `merge auto-match` | `cj_merge_auto_match` |
| 9.2 | POST | `/shopping/order/autoMergeQueryProgress` | `merge auto-progress` | `cj_merge_auto_progress` |
| 9.3 | POST | `/shopping/order/autoMergeQueryResult` | `merge auto-result` | `cj_merge_auto_result` |
| 9.4 | POST | `/shopping/order/submitMergeBatch` | `merge submit-batch` | `cj_merge_submit_batch` |
| 9.5 | POST | `/shopping/order/submitMergeProgress` | `merge submit-progress` | `cj_merge_submit_progress` |
| 9.6 | POST | `/shopping/order/submitMergeResult` | `merge submit-result` | `cj_merge_submit_result` |

### 10. Freight / Logistics (4 endpoints)
| # | Method | Path | CLI Command | MCP Tool |
|---|--------|------|-------------|----------|
| 10.1 | POST | `/logistic/freightCalculate` | `freight calculate` | `cj_freight_calculate` |
| 10.2 | POST | `/logistic/freightCalculateTip` | `freight calculate-tip` | `cj_freight_calculate_tip` |
| 10.3 | POST | `/logistic/partnerFreightCalculate` | `freight partner` | `cj_freight_partner` |
| 10.4 | POST | `/logistic/supplierSelfShipmentFreightCalculate` | `freight supplier-self` | `cj_freight_supplier_self` |

### 11. Tracking (2 endpoints)
| # | Method | Path | CLI Command | MCP Tool |
|---|--------|------|-------------|----------|
| 11.1 | GET | `/logistic/trackInfo` | `tracking info` | `cj_tracking_info` |
| 11.2 | GET | `/logistic/trackInfoV2` | `tracking info-v2` | `cj_tracking_info_v2` |

### 12. Disputes (6 endpoints)
| # | Method | Path | CLI Command | MCP Tool |
|---|--------|------|-------------|----------|
| 12.1 | GET | `/disputes/disputeProducts` | `dispute products` | `cj_dispute_products` |
| 12.2 | POST | `/disputes/disputeConfirmInfo` | `dispute confirm` | `cj_dispute_confirm` |
| 12.3 | POST | `/disputes/create` | `dispute create` | `cj_dispute_create` |
| 12.4 | POST | `/disputes/cancel` | `dispute cancel` | `cj_dispute_cancel` |
| 12.5 | GET | `/disputes/getDisputeList` | `dispute list` | `cj_dispute_list` |
| 12.6 | GET | `/disputes/getDisputeDetail` | `dispute detail` | `cj_dispute_detail` |

### 13. Webhooks (4 endpoints)
| # | Method | Path | CLI Command | MCP Tool |
|---|--------|------|-------------|----------|
| 13.1 | POST | `/webhook/set` | `webhook set --callback-url URL` | `cj_webhook_set` |
| 13.2 | POST | `/webhook/product/subscribe` | `webhook subscribe` | `cj_webhook_subscribe` |
| 13.3 | POST | `/webhook/product/unsubscribe` | `webhook unsubscribe` | `cj_webhook_unsubscribe` |
| 13.4 | GET | `/webhook/product/subscribe/list` | `webhook subscribed-list` | `cj_webhook_subscribed_list` |

### 14. Shop (3 endpoints)
| # | Method | Path | CLI Command | MCP Tool |
|---|--------|------|-------------|----------|
| 14.1 | GET | `/shop/getShops` | `shop list` | `cj_shop_list` |
| 14.2 | POST | `/store/product/saveProduct` | `shop save-product` | `cj_shop_save_product` |
| 14.3 | POST | `/store/product/saveVariantBatch` | `shop save-variants` | `cj_shop_save_variants` |

**Total: 73 endpoints across 14 groups**

## Webhook Configuration (Active)

- **Callback URL**: `https://api.delqhi.com/api/v1/suppliers/webhooks/cj-dropshipping`
- **Status**: All 4 topics ENABLED (product, stock, order, logistics)
- **subscribeAll**: true
- **Verification**: Go API accepts unsigned requests with `messageId`+`messageType`+`openId`

## Key Parameters for German Market

- **Shipping from**: CN (China warehouse) or DE (Germany warehouse)
- **IOSS**: Type 3 (CJ's IOSS) for EU orders under €150
- **Logistics for DE**: `logisticName` from freight calculation — e.g., "PostNL", "CJPacket"
- **Currency**: EUR (2.5x markup on USD sell price, fx rate 0.92)

## Order Flow (Customer → CJ)

1. Customer pays via Stripe → webhook updates `shop.orders` status to `paid`
2. Go Worker picks up `paid` orders → calls CJ `createOrderV2` with `payType=2` (balance)
3. CJ creates order → returns `orderId` → stored in `shop.supplier_orders`
4. CJ fulfills → logistics webhook updates tracking number
5. Track via `cj_tracking_info_v2` or `cj_order_detail`

## Rate Limits

- **QPS**: 1 request/second (auto-enforced in CLI and MCP)
- **Daily**: 1000 requests/day for free users
- **Token**: Access Token 15 days, Refresh Token 180 days (auto-managed)

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 1600001 | Authentication failed |
| 1600003 | Refresh token invalid |
| 1600100 | Param error |
| 1601000 | User not found |
| 1606010 | Product webhook not enabled |
| 1606011 | Subscription limit exceeded |
| 1607001 | Invalid callback URL (localhost etc.) |
| 1608001 | Warehouse info not found |
