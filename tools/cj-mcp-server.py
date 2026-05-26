#!/usr/bin/env python3
"""CJ Dropshipping MCP Server - All 50+ API endpoints as tools for opencode/LLM integration."""

from mcp.server.fastmcp import FastMCP
import json
import os
import time
import pathlib
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode

mcp = FastMCP("cj-dropshipping")

BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1"
API_KEY = os.environ.get("CJ_API_KEY", "CJ5240573@api@d5d074918b1f434995c26af2fc932bb8")
TOKEN_FILE = os.environ.get("CJ_TOKEN_FILE", str(pathlib.Path.home() / ".cj-tokens.json"))
LAST_REQUEST_TIME = [0.0]


def _rate_limit():
    elapsed = time.time() - LAST_REQUEST_TIME[0]
    if elapsed < 1.0:
        time.sleep(1.0 - elapsed)
    LAST_REQUEST_TIME[0] = time.time()


def _load_tokens():
    p = pathlib.Path(TOKEN_FILE)
    if p.exists():
        try:
            return json.loads(p.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {"accessToken": os.environ.get("CJ_ACCESS_TOKEN", ""),
            "refreshToken": os.environ.get("CJ_REFRESH_TOKEN", ""),
            "openId": os.environ.get("CJ_OPEN_ID", "")}


def _save_tokens(tokens):
    pathlib.Path(TOKEN_FILE).write_text(json.dumps(tokens, indent=2))


def _get_access_token():
    tokens = _load_tokens()
    if tokens.get("accessToken"):
        return tokens["accessToken"]
    result = _api_call("POST", "/authentication/getAccessToken", body={"apiKey": API_KEY}, no_auth=True)
    if result.get("code") == 200 and result.get("data"):
        data = result["data"]
        tokens["accessToken"] = data.get("accessToken", "")
        tokens["refreshToken"] = data.get("refreshToken", "")
        tokens["openId"] = str(data.get("openId", ""))
        tokens["accessTokenExpiryDate"] = data.get("accessTokenExpiryDate", "")
        tokens["refreshTokenExpiryDate"] = data.get("refreshTokenExpiryDate", "")
        _save_tokens(tokens)
        return tokens["accessToken"]
    return None


def _refresh_access_token():
    tokens = _load_tokens()
    rt = tokens.get("refreshToken")
    if not rt:
        return _get_access_token()
    result = _api_call("POST", "/authentication/refreshAccessToken", body={"refreshToken": rt}, no_auth=True)
    if result.get("code") == 200 and result.get("data"):
        data = result["data"]
        tokens["accessToken"] = data.get("accessToken", "")
        tokens["refreshToken"] = data.get("refreshToken", "")
        tokens["accessTokenExpiryDate"] = data.get("accessTokenExpiryDate", "")
        tokens["refreshTokenExpiryDate"] = data.get("refreshTokenExpiryDate", "")
        _save_tokens(tokens)
        return tokens["accessToken"]
    tokens["accessToken"] = ""
    tokens["refreshToken"] = ""
    _save_tokens(tokens)
    return _get_access_token()


def _api_call(method, path, body=None, params=None, no_auth=False, retry_auth=True):
    _rate_limit()
    url = f"{BASE_URL}{path}"
    if params:
        filtered = {k: v for k, v in params.items() if v is not None}
        if filtered:
            url += "?" + urlencode(filtered)

    headers = {"Content-Type": "application/json"}
    if not no_auth:
        token = _get_access_token()
        if token:
            headers["CJ-Access-Token"] = token

    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")

    req = Request(url, data=data, headers=headers, method=method)
    if data is None and method in ("GET", "DELETE"):
        req.data = None

    try:
        with urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")
        try:
            result = json.loads(body_text)
        except json.JSONDecodeError:
            result = {"code": e.code, "message": body_text, "success": False}
    except URLError as e:
        return {"code": -1, "message": str(e), "success": False}

    if not no_auth and result.get("code") == 1600001 and retry_auth:
        _refresh_access_token()
        return _api_call(method, path, body=body, params=params, no_auth=no_auth, retry_auth=False)

    return result


# ═══════════════════════════════════════════════════════════════════════════
# AUTHENTICATION
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def cj_auth_get_token() -> dict:
    """Get a new CJ access token using the API key. Tokens are cached automatically."""
    result = _api_call("POST", "/authentication/getAccessToken", body={"apiKey": API_KEY}, no_auth=True)
    if result.get("code") == 200 and result.get("data"):
        _save_tokens({
            "accessToken": result["data"].get("accessToken", ""),
            "refreshToken": result["data"].get("refreshToken", ""),
            "openId": str(result["data"].get("openId", "")),
            "accessTokenExpiryDate": result["data"].get("accessTokenExpiryDate", ""),
            "refreshTokenExpiryDate": result["data"].get("refreshTokenExpiryDate", ""),
        })
    return result


@mcp.tool()
def cj_auth_refresh_token() -> dict:
    """Refresh the CJ access token using the cached refresh token."""
    tokens = _load_tokens()
    result = _api_call("POST", "/authentication/refreshAccessToken", body={"refreshToken": tokens.get("refreshToken", "")}, no_auth=True)
    if result.get("code") == 200 and result.get("data"):
        t = _load_tokens()
        t["accessToken"] = result["data"].get("accessToken", "")
        t["refreshToken"] = result["data"].get("refreshToken", "")
        t["accessTokenExpiryDate"] = result["data"].get("accessTokenExpiryDate", "")
        t["refreshTokenExpiryDate"] = result["data"].get("refreshTokenExpiryDate", "")
        _save_tokens(t)
    return result


@mcp.tool()
def cj_auth_logout() -> dict:
    """Logout and invalidate the current access token and refresh token."""
    result = _api_call("POST", "/authentication/logout")
    if result.get("code") == 200:
        _save_tokens({"accessToken": "", "refreshToken": "", "openId": ""})
    return result


# ═══════════════════════════════════════════════════════════════════════════
# SETTINGS
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def cj_setting_get() -> dict:
    """Get account settings including profile, API quota limits, QPS limits, sandbox status, and webhook callback config."""
    return _api_call("GET", "/setting/get")


# ═══════════════════════════════════════════════════════════════════════════
# PRODUCTS
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def cj_product_categories() -> dict:
    """Get all product categories from CJ (3-level hierarchy: first > second > third with category IDs)."""
    return _api_call("GET", "/product/getCategory")


@mcp.tool()
def cj_product_list_v2(keyword: str = "", page: int = 1, size: int = 20,
                        category_id: str = "", country_code: str = "",
                        start_price: float = 0, end_price: float = 0,
                        free_shipping: int = -1, sort: str = "desc",
                        order_by: int = 0, product_flag: int = -1) -> dict:
    """Search CJ products using V2 API (elasticsearch-powered). Supports keyword search, filters, sorting.
    orderBy: 0=best match, 1=listing count, 2=sell price, 3=create time, 4=inventory
    productFlag: 0=trending, 1=new, 2=video, 3=slow-moving
    freeShipping: 0=no, 1=yes"""
    params = {"page": page, "size": size, "sort": sort}
    if keyword: params["keyWord"] = keyword
    if category_id: params["categoryId"] = category_id
    if country_code: params["countryCode"] = country_code
    if start_price > 0: params["startSellPrice"] = start_price
    if end_price > 0: params["endSellPrice"] = end_price
    if free_shipping >= 0: params["addMarkStatus"] = free_shipping
    if order_by > 0: params["orderBy"] = order_by
    if product_flag >= 0: params["productFlag"] = product_flag
    return _api_call("GET", "/product/listV2", params=params)


@mcp.tool()
def cj_product_list(page_num: int = 1, page_size: int = 20, category_id: str = "",
                    product_name_en: str = "", country_code: str = "",
                    min_price: float = 0, max_price: float = 0,
                    sort: str = "desc", order_by: str = "createAt") -> dict:
    """List CJ products using legacy V1 API. Fixed 20 results per page (max 200)."""
    params = {"pageNum": page_num, "pageSize": page_size, "sort": sort, "orderBy": order_by}
    if category_id: params["categoryId"] = category_id
    if product_name_en: params["productNameEn"] = product_name_en
    if country_code: params["countryCode"] = country_code
    if min_price > 0: params["minPrice"] = min_price
    if max_price > 0: params["maxPrice"] = max_price
    return _api_call("GET", "/product/list", params=params)


@mcp.tool()
def cj_product_detail(pid: str) -> dict:
    """Get detailed product information by product ID."""
    return _api_call("GET", "/product/detail", params={"pid": pid})


@mcp.tool()
def cj_product_warehouses() -> dict:
    """Get list of all available CJ global warehouses (China, US, Germany, etc.) with country codes."""
    return _api_call("GET", "/product/globalWarehouseList")


@mcp.tool()
def cj_product_add(pid: str) -> dict:
    """Add a CJ product to your 'My Products' list for easier management and order creation."""
    return _api_call("POST", "/product/addToMyProduct", body={"productId": pid})


@mcp.tool()
def cj_product_my_products(page_num: int = 1, page_size: int = 20) -> dict:
    """List products you've added to 'My Products' in your CJ account."""
    return _api_call("GET", "/product/myProductList", params={"pageNum": page_num, "pageSize": page_size})


@mcp.tool()
def cj_product_variants(pid: str) -> dict:
    """Get all variants of a product by product ID. Each variant has its own VID, SKU, price, and image."""
    return _api_call("GET", "/product/variant/query", params={"pid": pid})


@mcp.tool()
def cj_product_variant_by_vid(vid: str) -> dict:
    """Get variant details by variant ID (VID). Returns price, SKU, inventory, and image."""
    return _api_call("GET", "/product/variant/queryByVid", params={"vid": vid})


@mcp.tool()
def cj_product_stock(vid: str) -> dict:
    """Query inventory/stock for a specific variant by VID."""
    return _api_call("GET", "/product/stock/queryByVid", params={"vid": vid})


@mcp.tool()
def cj_product_stock_by_sku(sku: str) -> dict:
    """Query inventory/stock by product SKU."""
    return _api_call("GET", "/product/stock/queryBySku", params={"sku": sku})


@mcp.tool()
def cj_product_stock_by_pid(pid: str) -> dict:
    """Query inventory/stock by product ID. Includes sub-warehouse inventory distribution."""
    return _api_call("GET", "/product/stock/queryByPid", params={"pid": pid})


@mcp.tool()
def cj_product_reviews(pid: str, page_num: int = 1, page_size: int = 20) -> dict:
    """Get product reviews/ratings by product ID."""
    return _api_call("GET", "/product/review/list", params={"pid": pid, "pageNum": page_num, "pageSize": page_size})


@mcp.tool()
def cj_product_sourcing_create(name: str, image: str, link: str) -> dict:
    """Create a sourcing request to find a product that CJ doesn't currently list."""
    return _api_call("POST", "/product/sourcing/create", body={"productName": name, "productImage": image, "productLink": link})


@mcp.tool()
def cj_product_sourcing_query(keyword: str = "") -> dict:
    """Query existing sourcing requests."""
    body = {}
    if keyword: body["keyWord"] = keyword
    return _api_call("POST", "/product/sourcing/query", body=body)


@mcp.tool()
def cj_product_connections(page_num: int = 1, page_size: int = 20) -> dict:
    """List product connections between your store products and CJ products."""
    return _api_call("GET", "/product/connection/list", params={"pageNum": page_num, "pageSize": page_size})


@mcp.tool()
def cj_product_connect(pid: str, sku: str, store_sku: str) -> dict:
    """Create a product connection linking your store SKU to a CJ product variant."""
    return _api_call("POST", "/product/connection/create", body={"productId": pid, "sku": sku, "storeSku": store_sku})


@mcp.tool()
def cj_product_disconnect(pid: str) -> dict:
    """Disconnect a product connection between your store and CJ."""
    return _api_call("DELETE", "/product/connection/delete", params={"productId": pid})


@mcp.tool()
def cj_product_videos(pid: str) -> dict:
    """Query available product videos by product ID."""
    return _api_call("POST", "/product/video/query", body={"productId": pid})


@mcp.tool()
def cj_product_image_search(image_url: str) -> dict:
    """Search for CJ products by uploading an image URL (reverse image search)."""
    return _api_call("POST", "/product/imageSearch", body={"imageUrl": image_url})


# ═══════════════════════════════════════════════════════════════════════════
# WAREHOUSE / STORAGE
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def cj_warehouse_detail(id: str) -> dict:
    """Get warehouse detail by warehouse ID. Includes address, phone, supported logistics brands."""
    return _api_call("GET", "/warehouse/detail", params={"id": id})


@mcp.tool()
def cj_private_inventory_spu_page(keyword: str = "", page_num: int = 1, page_size: int = 20,
                                   available_stock: bool = False) -> dict:
    """Query private inventory SPU page. Lists products you have private stock for."""
    body = {"pageNum": page_num, "pageSize": page_size}
    if keyword: body["keyword"] = keyword
    if available_stock: body["availableStock"] = True
    return _api_call("POST", "/product/stock/privateInventory/querySpuPage", body=body)


@mcp.tool()
def cj_private_inventory_sku_list(product_id: str, keyword: str = "") -> dict:
    """Query private inventory SKU list for a specific product."""
    body = {"productId": product_id}
    if keyword: body["keyword"] = keyword
    return _api_call("POST", "/product/stock/privateInventory/querySkuListByProductId", body=body)


@mcp.tool()
def cj_private_inventory_sku_detail(sku: str = "", page_num: int = 1, page_size: int = 20,
                                     available_stock: bool = False) -> dict:
    """Query private inventory SKU detail with pagination. Shows available, locked, used quantities per warehouse."""
    body = {"pageNum": page_num, "pageSize": page_size}
    if sku: body["sku"] = sku
    if available_stock: body["availableStock"] = True
    return _api_call("POST", "/product/stock/privateInventory/querySkuDetailPage", body=body)


@mcp.tool()
def cj_private_inventory_sku_batch(sku: str) -> dict:
    """Query private inventory batch detail by SKU. Shows per-batch quantities and unit prices."""
    return _api_call("POST", "/product/stock/privateInventory/querySkuDetailListBySku", body={"sku": sku})


@mcp.tool()
def cj_private_inventory_sku_flow(sku: str = "", page_num: int = 1, page_size: int = 20) -> dict:
    """Query private inventory SKU flow/movement history. Shows stock in/out events."""
    body = {"pageNum": page_num, "pageSize": page_size}
    if sku: body["sku"] = sku
    return _api_call("POST", "/product/stock/privateInventory/querySkuFlowByCondition", body=body)


@mcp.tool()
def cj_warehouse_order_pictures(order_ids: str) -> dict:
    """Query warehouse order processing photos. order_ids: comma-separated CJ order IDs."""
    return _api_call("POST", "/storehouseCenterWeb/syncStorehouseVideoRequests",
                     body={"orderIdList": order_ids.split(",")})


# ═══════════════════════════════════════════════════════════════════════════
# ORDERS
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def cj_order_create_v2(order_number: str, country_code: str, country: str,
                        province: str, city: str, address: str, customer_name: str,
                        logistic_name: str, from_country_code: str,
                        products: str, pay_type: int = 2,
                        shipping_zip: str = "", shipping_phone: str = "",
                        email: str = "", remark: str = "",
                        ioss_type: int = 3, ioss_number: str = "CJ-IOSS",
                        platform: str = "api", shop_logistics_type: int = 2,
                        order_flow: int = 1) -> dict:
    """Create a CJ order (V2). products: JSON array like [{"vid":"...","quantity":1}].
    payType: 1=page payment, 2=balance payment, 3=create only.
    iossType: 1=no IOSS, 2=my IOSS, 3=CJ's IOSS.
    shopLogisticsType: 1=platform logistics, 2=seller logistics, 3=platform logistics (CJ warehouse)."""
    body = {
        "orderNumber": order_number, "shippingCountryCode": country_code,
        "shippingCountry": country, "shippingProvince": province,
        "shippingCity": city, "shippingAddress": address,
        "shippingCustomerName": customer_name, "logisticName": logistic_name,
        "fromCountryCode": from_country_code, "products": json.loads(products),
        "payType": pay_type, "iossType": ioss_type, "iossNumber": ioss_number,
        "platform": platform, "shopLogisticsType": shop_logistics_type, "orderFlow": order_flow,
    }
    if shipping_zip: body["shippingZip"] = shipping_zip
    if shipping_phone: body["shippingPhone"] = shipping_phone
    if email: body["email"] = email
    if remark: body["remark"] = remark
    return _api_call("POST", "/shopping/order/createOrderV2", body=body)


@mcp.tool()
def cj_order_create_v3(order_number: str, country_code: str, country: str,
                        province: str, city: str, address: str, customer_name: str,
                        logistic_name: str, from_country_code: str,
                        products: str,
                        shipping_zip: str = "", shipping_phone: str = "",
                        email: str = "", remark: str = "",
                        ioss_type: int = 3, ioss_number: str = "CJ-IOSS",
                        platform: str = "api", shop_logistics_type: int = 2,
                        order_flow: int = 1, is_sandbox: int = 0) -> dict:
    """Create a CJ order (V3 - latest). products: JSON array like [{"vid":"...","quantity":1}].
    isSandbox: 0=real order, 1=sandbox (simulated)."""
    body = {
        "orderNumber": order_number, "shippingCountryCode": country_code,
        "shippingCountry": country, "shippingProvince": province,
        "shippingCity": city, "shippingAddress": address,
        "shippingCustomerName": customer_name, "logisticName": logistic_name,
        "fromCountryCode": from_country_code, "products": json.loads(products),
        "iossType": ioss_type, "iossNumber": ioss_number,
        "platform": platform, "shopLogisticsType": shop_logistics_type,
        "orderFlow": order_flow, "isSandbox": is_sandbox,
    }
    if shipping_zip: body["shippingZip"] = shipping_zip
    if shipping_phone: body["shippingPhone"] = shipping_phone
    if email: body["email"] = email
    if remark: body["remark"] = remark
    return _api_call("POST", "/shopping/order/createOrderV3", body=body)


@mcp.tool()
def cj_order_add_cart(order_ids: str) -> dict:
    """Add orders to CJ cart. order_ids: comma-separated CJ order IDs."""
    return _api_call("POST", "/shopping/order/addCart", body={"cjOrderIdList": order_ids.split(",")})


@mcp.tool()
def cj_order_add_cart_confirm(order_id: str) -> dict:
    """Confirm adding an order to cart."""
    return _api_call("POST", "/shopping/order/addCartConfirm", body={"orderId": order_id})


@mcp.tool()
def cj_order_save_parent(order_ids: str) -> dict:
    """Generate a parent order from multiple orders. order_ids: comma-separated."""
    return _api_call("POST", "/shopping/order/saveGenerateParentOrder", body={"orderIdList": order_ids.split(",")})


@mcp.tool()
def cj_order_list(page_num: int = 1, page_size: int = 20) -> dict:
    """List CJ orders with pagination."""
    return _api_call("GET", "/shopping/order/list", params={"pageNum": page_num, "pageSize": page_size})


@mcp.tool()
def cj_order_detail(order_id: str) -> dict:
    """Get detailed CJ order information by order ID."""
    return _api_call("GET", "/shopping/order/getOrderDetail", params={"orderId": order_id})


@mcp.tool()
def cj_order_delete(order_id: str) -> dict:
    """Delete a CJ order."""
    return _api_call("DELETE", "/shopping/order/delete", params={"orderId": order_id})


@mcp.tool()
def cj_order_confirm(order_id: str) -> dict:
    """Confirm a CJ order (proceed to fulfillment after review)."""
    return _api_call("PATCH", "/shopping/order/confirm", params={"orderId": order_id})


@mcp.tool()
def cj_order_change_warehouse(order_id: str, storage_id: str) -> dict:
    """Change the warehouse for an existing order."""
    return _api_call("POST", "/shopping/order/changeWarehouse", body={"orderId": order_id, "storageId": storage_id})


@mcp.tool()
def cj_order_sandbox_pay(order_id: str) -> dict:
    """Simulate payment for a sandbox order (test mode only)."""
    return _api_call("POST", "/shopping/order/sandboxPay", body={"orderId": order_id})


@mcp.tool()
def cj_order_sandbox_update_status(order_id: str, status: str) -> dict:
    """Update sandbox order status for testing."""
    return _api_call("POST", "/shopping/order/sandboxUpdateStatus", body={"orderId": order_id, "status": status})


# ═══════════════════════════════════════════════════════════════════════════
# PAYMENT / BALANCE
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def cj_balance_get() -> dict:
    """Get your CJ account balance."""
    return _api_call("GET", "/shopping/pay/getBalance")


@mcp.tool()
def cj_balance_pay(order_id: str) -> dict:
    """Pay for an order using CJ balance."""
    return _api_call("POST", "/shopping/pay/payBalance", body={"orderId": order_id})


@mcp.tool()
def cj_balance_pay_v2(order_ids: str) -> dict:
    """Pay for multiple orders using CJ balance. order_ids: comma-separated."""
    return _api_call("POST", "/shopping/pay/payBalanceV2", body={"orderIdList": order_ids.split(",")})


# ═══════════════════════════════════════════════════════════════════════════
# SHIPPING
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def cj_shipping_upload(order_id: str, tracking_number: str, carrier: str) -> dict:
    """Upload shipping/tracking info for a platform logistics order."""
    return _api_call("POST", "/shopping/shipping/upload", body={
        "orderId": order_id, "trackingNumber": tracking_number, "carrier": carrier})


@mcp.tool()
def cj_shipping_update(order_id: str, tracking_number: str, carrier: str) -> dict:
    """Update shipping/tracking info for an order."""
    return _api_call("POST", "/shopping/shipping/update", body={
        "orderId": order_id, "trackingNumber": tracking_number, "carrier": carrier})


@mcp.tool()
def cj_shipping_update_pod(order_id: str, image_urls: str) -> dict:
    """Update POD (print-on-demand) pictures for an order. image_urls: comma-separated URLs."""
    return _api_call("POST", "/shopping/shipping/updatePodPictures", body={
        "orderId": order_id, "imageUrlList": image_urls.split(",")})


# ═══════════════════════════════════════════════════════════════════════════
# COGS
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def cj_cogs_query(order_ids: str) -> dict:
    """Query COGS (Cost of Goods Sold) basic data for orders. order_ids: comma-separated."""
    return _api_call("POST", "/shopping/cogs/query", body={"orderIdList": order_ids.split(",")})


# ═══════════════════════════════════════════════════════════════════════════
# MERGE ORDERS
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def cj_merge_auto_match(order_ids: str) -> dict:
    """Auto-match orders for merging. order_ids: comma-separated CJ order IDs."""
    return _api_call("POST", "/shopping/order/autoMatchMergeList", body={"orderIdList": order_ids.split(",")})


@mcp.tool()
def cj_merge_auto_progress(batch_id: str) -> dict:
    """Query auto-merge progress by batch ID."""
    return _api_call("POST", "/shopping/order/autoMergeQueryProgress", body={"batchId": batch_id})


@mcp.tool()
def cj_merge_auto_result(batch_id: str) -> dict:
    """Query auto-merge result by batch ID."""
    return _api_call("POST", "/shopping/order/autoMergeQueryResult", body={"batchId": batch_id})


@mcp.tool()
def cj_merge_submit_batch(order_ids: str) -> dict:
    """Submit a batch of orders for manual merging. order_ids: comma-separated."""
    return _api_call("POST", "/shopping/order/submitMergeBatch", body={"orderIdList": order_ids.split(",")})


@mcp.tool()
def cj_merge_submit_progress(batch_id: str) -> dict:
    """Query submit-merge progress."""
    return _api_call("POST", "/shopping/order/submitMergeProgress", body={"batchId": batch_id})


@mcp.tool()
def cj_merge_submit_result(batch_id: str) -> dict:
    """Query submit-merge result."""
    return _api_call("POST", "/shopping/order/submitMergeResult", body={"batchId": batch_id})


# ═══════════════════════════════════════════════════════════════════════════
# FREIGHT / LOGISTICS
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def cj_freight_calculate(from_country: str, to_country: str, products: str) -> dict:
    """Calculate freight/shipping costs. products: JSON array like [{"vid":"...","quantity":2}].
    Returns available shipping methods with prices and delivery times."""
    return _api_call("POST", "/logistic/freightCalculate", body={
        "startCountryCode": from_country, "endCountryCode": to_country,
        "products": json.loads(products)})


@mcp.tool()
def cj_freight_calculate_tip(from_country: str, to_country: str, products: str) -> dict:
    """Advanced freight calculation with more accurate results. products: JSON array of {sku, skuQuantity}.
    Returns detailed shipping options with rule tips, remote fees, and IOSS info."""
    return _api_call("POST", "/logistic/freightCalculateTip", body={
        "reqDTOS": [{"srcAreaCode": from_country, "destAreaCode": to_country,
                     "freightTrialSkuList": json.loads(products)}]})


@mcp.tool()
def cj_freight_partner(order_number: str, country_code: str, country: str,
                        province: str, city: str, zip_code: str,
                        from_country: str, products: str) -> dict:
    """Partner freight calculation for merchant partner orders. products: JSON array of {vid,quantity}."""
    return _api_call("POST", "/logistic/partnerFreightCalculate", body={
        "orderNumber": order_number, "shippingCountryCode": country_code,
        "shippingCountry": country, "shippingProvince": province,
        "shippingCity": city, "shippingZip": zip_code,
        "fromCountryCode": from_country, "products": json.loads(products)})


@mcp.tool()
def cj_freight_supplier_self(from_country: str, to_country: str, products: str) -> dict:
    """Calculate freight for supplier self-shipment orders. products: JSON array of {vid,quantity}."""
    return _api_call("POST", "/logistic/supplierSelfShipmentFreightCalculate", body={
        "startCountryCode": from_country, "endCountryCode": to_country,
        "products": json.loads(products)})


# ═══════════════════════════════════════════════════════════════════════════
# TRACKING
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def cj_tracking_info(order_id: str) -> dict:
    """Get tracking information for a CJ order (deprecated, use info_v2)."""
    return _api_call("GET", "/logistic/trackInfo", params={"orderId": order_id})


@mcp.tool()
def cj_tracking_info_v2(order_id: str) -> dict:
    """Get tracking information V2 for a CJ order with more details."""
    return _api_call("GET", "/logistic/trackInfoV2", params={"orderId": order_id})


# ═══════════════════════════════════════════════════════════════════════════
# DISPUTES
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def cj_dispute_products(order_id: str) -> dict:
    """Get list of products eligible for dispute from a CJ order."""
    return _api_call("GET", "/disputes/disputeProducts", params={"orderId": order_id})


@mcp.tool()
def cj_dispute_confirm(order_id: str, items: str) -> dict:
    """Confirm dispute details before creating. items: JSON array of {lineItemId,quantity}."""
    return _api_call("POST", "/disputes/disputeConfirmInfo", body={
        "orderId": order_id, "productInfoList": json.loads(items)})


@mcp.tool()
def cj_dispute_create(order_id: str, business_dispute_id: str, reason_id: int,
                       expect_type: int, refund_type: int, message: str,
                       image_urls: str = "", product_items: str = "") -> dict:
    """Create a dispute for a CJ order. expectType: 1=Refund, 2=Reissue. refundType: 1=balance, 2=platform.
    productItems: JSON array of {lineItemId,quantity}."""
    body = {"orderId": order_id, "businessDisputeId": business_dispute_id,
            "disputeReasonId": reason_id, "expectType": expect_type,
            "refundType": refund_type, "messageText": message}
    if image_urls:
        body["imageUrl"] = image_urls.split(",")
    if product_items:
        body["productInfoList"] = json.loads(product_items)
    return _api_call("POST", "/disputes/create", body=body)


@mcp.tool()
def cj_dispute_cancel(order_id: str, dispute_id: str) -> dict:
    """Cancel an existing dispute."""
    return _api_call("POST", "/disputes/cancel", body={"orderId": order_id, "disputeId": dispute_id})


@mcp.tool()
def cj_dispute_list(page_num: int = 1, page_size: int = 10) -> dict:
    """List all disputes with pagination."""
    return _api_call("GET", "/disputes/getDisputeList", params={"pageNum": page_num, "pageSize": page_size})


@mcp.tool()
def cj_dispute_detail(dispute_id: str) -> dict:
    """Get detailed dispute information by dispute ID."""
    return _api_call("GET", "/disputes/getDisputeDetail", params={"disputeId": dispute_id})


# ═══════════════════════════════════════════════════════════════════════════
# WEBHOOKS
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def cj_webhook_set(callback_url: str, enable_product: bool = True, enable_stock: bool = True,
                    enable_order: bool = True, enable_logistics: bool = True) -> dict:
    """Configure webhook callbacks. All 4 topics can be enabled/disabled independently.
    Callback URL must be a public HTTPS address."""
    body = {}
    for topic, enabled in [("product", enable_product), ("stock", enable_stock),
                           ("order", enable_order), ("logistics", enable_logistics)]:
        body[topic] = {"type": "ENABLE" if enabled else "CANCEL", "callbackUrls": [callback_url]}
    return _api_call("POST", "/webhook/set", body=body)


@mcp.tool()
def cj_webhook_subscribe(product_ids: str = "", subscribe_all: bool = False) -> dict:
    """Subscribe to product/variant/stock webhook notifications for specific products or all.
    product_ids: comma-separated CJ product IDs. subscribe_all: subscribe to all products."""
    body = {}
    if product_ids:
        body["productIds"] = product_ids.split(",")
    if subscribe_all:
        body["subscribeAll"] = True
    return _api_call("POST", "/webhook/product/subscribe", body=body)


@mcp.tool()
def cj_webhook_unsubscribe(product_ids: str) -> dict:
    """Unsubscribe from product webhook notifications. product_ids: comma-separated."""
    return _api_call("POST", "/webhook/product/unsubscribe", body={"productIds": product_ids.split(",")})


@mcp.tool()
def cj_webhook_subscribed_list(page_num: int = 1, page_size: int = 20) -> dict:
    """List all subscribed products for webhook notifications."""
    return _api_call("GET", "/webhook/product/subscribe/list", params={"pageNum": page_num, "pageSize": page_size})


# ═══════════════════════════════════════════════════════════════════════════
# SHOP
# ═══════════════════════════════════════════════════════════════════════════

@mcp.tool()
def cj_shop_list() -> dict:
    """List all shops bound to/created under the current CJ account."""
    return _api_call("GET", "/shop/getShops")


@mcp.tool()
def cj_shop_save_product(id: str, title: str, image: str, description: str = "",
                          price_min: float = 0, price_max: float = 0,
                          price_currency: str = "EUR") -> dict:
    """Save a store product to CJ system for order flow mapping."""
    body = {"id": id, "title": title, "image": image}
    if description: body["description"] = description
    if price_min > 0: body["priceMin"] = price_min
    if price_max > 0: body["priceMax"] = price_max
    if price_min > 0: body["priceCurrency"] = price_currency
    return _api_call("POST", "/store/product/saveProduct", body=body)


@mcp.tool()
def cj_shop_save_variants(variants: str) -> dict:
    """Save store product variants in batch. variants: JSON array of {id,productId,title,sku,image,shopPrice,shopPriceCurrency}."""
    return _api_call("POST", "/store/product/saveVariantBatch", body={"variants": json.loads(variants)})


# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    mcp.run(transport="stdio")
