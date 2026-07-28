#!/usr/bin/env python3
"""CJ Dropshipping API CLI - Complete coverage of all API endpoints.

Usage:
    cj-cli.py auth get-token
    cj-cli.py auth refresh-token
    cj-cli.py auth logout
    cj-cli.py setting get
    cj-cli.py product categories
    cj-cli.py product list [--page NUM] [--size NUM] [--category-id ID] [--name NAME] ...
    cj-cli.py product list-v2 [--keyword KW] [--page NUM] [--size NUM] ...
    cj-cli.py product detail --pid PID
    cj-cli.py product warehouses
    cj-cli.py product add --pid PID
    cj-cli.py product my-products [--page NUM] [--size NUM]
    cj-cli.py product variants --pid PID
    cj-cli.py product variant-by-vid --vid VID
    cj-cli.py product stock --vid VID
    cj-cli.py product stock-by-sku --sku SKU
    cj-cli.py product stock-by-pid --pid PID
    cj-cli.py product reviews --pid PID [--page NUM] [--size NUM]
    cj-cli.py product sourcing create --name NAME --image URL --link URL
    cj-cli.py product sourcing query [--keyword KW]
    cj-cli.py product connections [--page NUM] [--size NUM]
    cj-cli.py product connect --pid PID --sku SKU --store-sku STORESKU
    cj-cli.py product disconnect --pid PID
    cj-cli.py product videos --pid PID
    cj-cli.py product image-search --image-url URL
    cj-cli.py warehouse detail --id ID
    cj-cli.py private-inventory spu-page [--keyword KW] [--page NUM] [--size NUM]
    cj-cli.py private-inventory sku-list --product-id PID
    cj-cli.py private-inventory sku-detail [--sku SKU] [--page NUM] [--size NUM]
    cj-cli.py private-inventory sku-batch --sku SKU
    cj-cli.py private-inventory sku-flow [--sku SKU] [--page NUM] [--size NUM]
    cj-cli.py private-inventory warehouse-pictures --order-ids ID1,ID2
    cj-cli.py order create-v2 --order-num NUM --country-code CC --country NAME --province PROV --city CITY --address ADDR --customer-name NAME --logistic-name LN --from-country-code CC --products JSON
    cj-cli.py order create-v3 --order-num NUM --country-code CC --country NAME --province PROV --city CITY --address ADDR --customer-name NAME --logistic-name LN --from-country-code CC --products JSON
    cj-cli.py order add-cart --order-ids ID1,ID2
    cj-cli.py order add-cart-confirm --order-id ID
    cj-cli.py order save-parent --order-ids ID1,ID2
    cj-cli.py order list [--page NUM] [--size NUM]
    cj-cli.py order detail --order-id ID
    cj-cli.py order delete --order-id ID
    cj-cli.py order confirm --order-id ID
    cj-cli.py order change-warehouse --order-id ID --storage-id ID
    cj-cli.py order sandbox-pay --order-id ID
    cj-cli.py order sandbox-status --order-id ID --status STATUS
    cj-cli.py balance get
    cj-cli.py balance pay --order-id ID --amount AMOUNT
    cj-cli.py balance pay-v2 --order-ids ID1,ID2
    cj-cli.py shipping upload --order-id ID --tracking TRACK --carrier CARRIER
    cj-cli.py shipping update --order-id ID --tracking TRACK --carrier CARRIER
    cj-cli.py shipping update-pod --order-id ID --images URL1,URL2
    cj-cli.py cogs query --order-ids ID1,ID2
    cj-cli.py merge auto-match --order-ids ID1,ID2
    cj-cli.py merge auto-progress --batch-id ID
    cj-cli.py merge auto-result --batch-id ID
    cj-cli.py merge submit-batch --order-ids ID1,ID2
    cj-cli.py merge submit-progress --batch-id ID
    cj-cli.py merge submit-result --batch-id ID
    cj-cli.py freight calculate --from CC --to CC --products JSON
    cj-cli.py freight calculate-tip --from CC --to CC --products JSON
    cj-cli.py freight partner --order-num NUM --country-code CC --country NAME --zip ZIP --province PROV --city CITY --from CC --products JSON
    cj-cli.py freight supplier-self --from CC --to CC --products JSON
    cj-cli.py tracking info --order-id ID
    cj-cli.py tracking info-v2 --order-id ID
    cj-cli.py dispute products --order-id ID
    cj-cli.py dispute confirm --order-id ID --items JSON
    cj-cli.py dispute create --order-id ID --business-id BID --reason-id RID --expect-type ET --refund-type RT --message MSG
    cj-cli.py dispute cancel --order-id ID --dispute-id DID
    cj-cli.py dispute list [--page NUM] [--size NUM]
    cj-cli.py dispute detail --dispute-id ID
    cj-cli.py webhook set --callback-url URL [--enable-product] [--enable-stock] [--enable-order] [--enable-logistics]
    cj-cli.py webhook subscribe --product-ids ID1,ID2 [--subscribe-all]
    cj-cli.py webhook unsubscribe --product-ids ID1,ID2
    cj-cli.py webhook subscribed-list [--page NUM] [--size NUM]
    cj-cli.py shop list
    cj-cli.py shop save-product --id ID --title TITLE --image URL
    cj-cli.py shop save-variants --variants JSON

Environment:
    CJ_API_KEY       - API key (default: CJ5240573@api@d5d074918b1f434995c26af2fc932bb8)
    CJ_ACCESS_TOKEN  - Cached access token (auto-managed if not set)
    CJ_REFRESH_TOKEN - Cached refresh token (auto-managed if not set)
    CJ_TOKEN_FILE    - Token cache file (default: ~/.cj-tokens.json)
"""

import argparse
import json
import os
import sys
import time
import pathlib
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode

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
    print("No cached access token. Fetching new one...", file=sys.stderr)
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
    print(f"Auth failed: {result}", file=sys.stderr)
    sys.exit(1)


def _refresh_access_token():
    tokens = _load_tokens()
    rt = tokens.get("refreshToken")
    if not rt:
        print("No refresh token available. Getting new token...", file=sys.stderr)
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
    print(f"Refresh failed ({result.get('code')}): {result.get('message')}. Getting new token...", file=sys.stderr)
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


def _out(data):
    print(json.dumps(data, indent=2, ensure_ascii=False))


def _parse_json_or_file(val):
    if val is None:
        return None
    p = pathlib.Path(val)
    if p.exists():
        return json.loads(p.read_text())
    return json.loads(val)


# ── Auth ──────────────────────────────────────────────────────────────────

def cmd_auth_get_token(args):
    result = _api_call("POST", "/authentication/getAccessToken", body={"apiKey": API_KEY}, no_auth=True)
    if result.get("code") == 200 and result.get("data"):
        _save_tokens({
            "accessToken": result["data"].get("accessToken", ""),
            "refreshToken": result["data"].get("refreshToken", ""),
            "openId": str(result["data"].get("openId", "")),
            "accessTokenExpiryDate": result["data"].get("accessTokenExpiryDate", ""),
            "refreshTokenExpiryDate": result["data"].get("refreshTokenExpiryDate", ""),
        })
    _out(result)


def cmd_auth_refresh_token(args):
    tokens = _load_tokens()
    result = _api_call("POST", "/authentication/refreshAccessToken", body={"refreshToken": tokens.get("refreshToken", "")}, no_auth=True)
    if result.get("code") == 200 and result.get("data"):
        t = _load_tokens()
        t["accessToken"] = result["data"].get("accessToken", "")
        t["refreshToken"] = result["data"].get("refreshToken", "")
        t["accessTokenExpiryDate"] = result["data"].get("accessTokenExpiryDate", "")
        t["refreshTokenExpiryDate"] = result["data"].get("refreshTokenExpiryDate", "")
        _save_tokens(t)
    _out(result)


def cmd_auth_logout(args):
    result = _api_call("POST", "/authentication/logout")
    if result.get("code") == 200:
        _save_tokens({"accessToken": "", "refreshToken": "", "openId": ""})
    _out(result)


# ── Settings ──────────────────────────────────────────────────────────────

def cmd_setting_get(args):
    _out(_api_call("GET", "/setting/get"))


# ── Products ──────────────────────────────────────────────────────────────

def cmd_product_categories(args):
    _out(_api_call("GET", "/product/getCategory"))


def cmd_product_list(args):
    params = {}
    if args.page_num:
        params["pageNum"] = args.page_num
    if args.page_size:
        params["pageSize"] = args.page_size
    if args.category_id:
        params["categoryId"] = args.category_id
    if args.pid:
        params["pid"] = args.pid
    if args.product_sku:
        params["productSku"] = args.product_sku
    if args.product_name:
        params["productName"] = args.product_name
    if args.product_name_en:
        params["productNameEn"] = args.product_name_en
    if args.country_code:
        params["countryCode"] = args.country_code
    if args.delivery_time:
        params["deliveryTime"] = args.delivery_time
    if args.min_price is not None:
        params["minPrice"] = args.min_price
    if args.max_price is not None:
        params["maxPrice"] = args.max_price
    if args.sort:
        params["sort"] = args.sort
    if args.order_by:
        params["orderBy"] = args.order_by
    _out(_api_call("GET", "/product/list", params=params))


def cmd_product_list_v2(args):
    params = {}
    if args.keyword:
        params["keyWord"] = args.keyword
    if args.page:
        params["page"] = args.page
    if args.size:
        params["size"] = args.size
    if args.category_id:
        params["categoryId"] = args.category_id
    if args.country_code:
        params["countryCode"] = args.country_code
    if args.start_price is not None:
        params["startSellPrice"] = args.start_price
    if args.end_price is not None:
        params["endSellPrice"] = args.end_price
    if args.free_shipping is not None:
        params["addMarkStatus"] = args.free_shipping
    if args.sort:
        params["sort"] = args.sort
    if args.order_by is not None:
        params["orderBy"] = args.order_by
    if args.features:
        params["features"] = args.features
    if args.product_flag is not None:
        params["productFlag"] = args.product_flag
    _out(_api_call("GET", "/product/listV2", params=params))


def cmd_product_detail(args):
    _out(_api_call("GET", "/product/detail", params={"pid": args.pid}))


def cmd_product_warehouses(args):
    _out(_api_call("GET", "/product/globalWarehouseList"))


def cmd_product_add(args):
    _out(_api_call("POST", "/product/addToMyProduct", body={"productId": args.pid}))


def cmd_product_my_products(args):
    params = {}
    if args.page_num:
        params["pageNum"] = args.page_num
    if args.page_size:
        params["pageSize"] = args.page_size
    _out(_api_call("GET", "/product/myProductList", params=params))


def cmd_product_variants(args):
    _out(_api_call("GET", "/product/variant/query", params={"pid": args.pid}))


def cmd_product_variant_by_vid(args):
    _out(_api_call("GET", "/product/variant/queryByVid", params={"vid": args.vid}))


def cmd_product_stock(args):
    _out(_api_call("GET", "/product/stock/queryByVid", params={"vid": args.vid}))


def cmd_product_stock_by_sku(args):
    _out(_api_call("GET", "/product/stock/queryBySku", params={"sku": args.sku}))


def cmd_product_stock_by_pid(args):
    _out(_api_call("GET", "/product/stock/queryByPid", params={"pid": args.pid}))


def cmd_product_reviews(args):
    params = {"pid": args.pid}
    if args.page_num:
        params["pageNum"] = args.page_num
    if args.page_size:
        params["pageSize"] = args.page_size
    _out(_api_call("GET", "/product/review/list", params=params))


def cmd_product_sourcing_create(args):
    body = {"productName": args.name, "productImage": args.image, "productLink": args.link}
    _out(_api_call("POST", "/product/sourcing/create", body=body))


def cmd_product_sourcing_query(args):
    body = {}
    if args.keyword:
        body["keyWord"] = args.keyword
    _out(_api_call("POST", "/product/sourcing/query", body=body))


def cmd_product_connections(args):
    params = {}
    if args.page_num:
        params["pageNum"] = args.page_num
    if args.page_size:
        params["pageSize"] = args.page_size
    _out(_api_call("GET", "/product/connection/list", params=params))


def cmd_product_connect(args):
    _out(_api_call("POST", "/product/connection/create", body={
        "productId": args.pid, "sku": args.sku, "storeSku": args.store_sku}))


def cmd_product_disconnect(args):
    _out(_api_call("DELETE", "/product/connection/delete", params={"productId": args.pid}))


def cmd_product_videos(args):
    _out(_api_call("POST", "/product/video/query", body={"productId": args.pid}))


def cmd_product_image_search(args):
    _out(_api_call("POST", "/product/imageSearch", body={"imageUrl": args.image_url}))


# ── Warehouse / Storage ───────────────────────────────────────────────────

def cmd_warehouse_detail(args):
    _out(_api_call("GET", "/warehouse/detail", params={"id": args.id}))


# ── Private Inventory ─────────────────────────────────────────────────────

def cmd_pi_spu_page(args):
    body = {"pageNum": args.page_num or 1, "pageSize": args.page_size or 20}
    if args.keyword:
        body["keyword"] = args.keyword
    if args.available_stock:
        body["availableStock"] = True
    _out(_api_call("POST", "/product/stock/privateInventory/querySpuPage", body=body))


def cmd_pi_sku_list(args):
    body = {"productId": args.product_id}
    if args.keyword:
        body["keyword"] = args.keyword
    _out(_api_call("POST", "/product/stock/privateInventory/querySkuListByProductId", body=body))


def cmd_pi_sku_detail(args):
    body = {"pageNum": args.page_num or 1, "pageSize": args.page_size or 20}
    if args.sku:
        body["sku"] = args.sku
    if args.available_stock:
        body["availableStock"] = True
    _out(_api_call("POST", "/product/stock/privateInventory/querySkuDetailPage", body=body))


def cmd_pi_sku_batch(args):
    body = {"sku": args.sku}
    _out(_api_call("POST", "/product/stock/privateInventory/querySkuDetailListBySku", body=body))


def cmd_pi_sku_flow(args):
    body = {"pageNum": args.page_num or 1, "pageSize": args.page_size or 20}
    if args.sku:
        body["sku"] = args.sku
    _out(_api_call("POST", "/product/stock/privateInventory/querySkuFlowByCondition", body=body))


def cmd_pi_warehouse_pictures(args):
    order_ids = args.order_ids.split(",")
    _out(_api_call("POST", "/storehouseCenterWeb/syncStorehouseVideoRequests", body={"orderIdList": order_ids}))


# ── Orders ─────────────────────────────────────────────────────────────────

def _build_order_body(args):
    body = {
        "orderNumber": args.order_num,
        "shippingCountryCode": args.country_code,
        "shippingCountry": args.country,
        "shippingProvince": args.province,
        "shippingCity": args.city,
        "shippingAddress": args.address,
        "shippingCustomerName": args.customer_name,
        "logisticName": args.logistic_name,
        "fromCountryCode": args.from_country_code,
        "products": _parse_json_or_file(args.products),
    }
    for opt in ["shipping_zip", "shipping_phone", "shipping_address2", "house_number",
                "email", "remark", "tax_id", "shop_amount", "platform", "ioss_type",
                "ioss_number", "pay_type", "shop_logistics_type", "storage_id", "order_flow",
                "store_name"]:
        val = getattr(args, opt, None)
        if val is not None:
            key = opt
            body[key] = val
    return body


def cmd_order_create_v2(args):
    _out(_api_call("POST", "/shopping/order/createOrderV2", body=_build_order_body(args)))


def cmd_order_create_v3(args):
    _out(_api_call("POST", "/shopping/order/createOrderV3", body=_build_order_body(args)))


def cmd_order_add_cart(args):
    order_ids = args.order_ids.split(",")
    _out(_api_call("POST", "/shopping/order/addCart", body={"cjOrderIdList": order_ids}))


def cmd_order_add_cart_confirm(args):
    _out(_api_call("POST", "/shopping/order/addCartConfirm", body={"orderId": args.order_id}))


def cmd_order_save_parent(args):
    order_ids = args.order_ids.split(",")
    _out(_api_call("POST", "/shopping/order/saveGenerateParentOrder", body={"orderIdList": order_ids}))


def cmd_order_list(args):
    params = {}
    if args.page_num:
        params["pageNum"] = args.page_num
    if args.page_size:
        params["pageSize"] = args.page_size
    _out(_api_call("GET", "/shopping/order/list", params=params))


def cmd_order_detail(args):
    _out(_api_call("GET", "/shopping/order/getOrderDetail", params={"orderId": args.order_id}))


def cmd_order_delete(args):
    _out(_api_call("DELETE", "/shopping/order/delete", params={"orderId": args.order_id}))


def cmd_order_confirm(args):
    _out(_api_call("PATCH", "/shopping/order/confirm", params={"orderId": args.order_id}))


def cmd_order_change_warehouse(args):
    _out(_api_call("POST", "/shopping/order/changeWarehouse", body={
        "orderId": args.order_id, "storageId": args.storage_id}))


def cmd_order_sandbox_pay(args):
    _out(_api_call("POST", "/shopping/order/sandboxPay", body={"orderId": args.order_id}))


def cmd_order_sandbox_status(args):
    _out(_api_call("POST", "/shopping/order/sandboxUpdateStatus", body={
        "orderId": args.order_id, "status": args.status}))


# ── Balance / Payment ─────────────────────────────────────────────────────

def cmd_balance_get(args):
    _out(_api_call("GET", "/shopping/pay/getBalance"))


def cmd_balance_pay(args):
    _out(_api_call("POST", "/shopping/pay/payBalance", body={"orderId": args.order_id}))


def cmd_balance_pay_v2(args):
    order_ids = args.order_ids.split(",")
    _out(_api_call("POST", "/shopping/pay/payBalanceV2", body={"orderIdList": order_ids}))


# ── Shipping ──────────────────────────────────────────────────────────────

def cmd_shipping_upload(args):
    _out(_api_call("POST", "/shopping/shipping/upload", body={
        "orderId": args.order_id, "trackingNumber": args.tracking, "carrier": args.carrier}))


def cmd_shipping_update(args):
    _out(_api_call("POST", "/shopping/shipping/update", body={
        "orderId": args.order_id, "trackingNumber": args.tracking, "carrier": args.carrier}))


def cmd_shipping_update_pod(args):
    images = args.images.split(",")
    _out(_api_call("POST", "/shopping/shipping/updatePodPictures", body={
        "orderId": args.order_id, "imageUrlList": images}))


# ── COGS ──────────────────────────────────────────────────────────────────

def cmd_cogs_query(args):
    order_ids = args.order_ids.split(",")
    _out(_api_call("POST", "/shopping/cogs/query", body={"orderIdList": order_ids}))


# ── Merge Orders ──────────────────────────────────────────────────────────

def cmd_merge_auto_match(args):
    order_ids = args.order_ids.split(",")
    _out(_api_call("POST", "/shopping/order/autoMatchMergeList", body={"orderIdList": order_ids}))


def cmd_merge_auto_progress(args):
    _out(_api_call("POST", "/shopping/order/autoMergeQueryProgress", body={"batchId": args.batch_id}))


def cmd_merge_auto_result(args):
    _out(_api_call("POST", "/shopping/order/autoMergeQueryResult", body={"batchId": args.batch_id}))


def cmd_merge_submit_batch(args):
    order_ids = args.order_ids.split(",")
    _out(_api_call("POST", "/shopping/order/submitMergeBatch", body={"orderIdList": order_ids}))


def cmd_merge_submit_progress(args):
    _out(_api_call("POST", "/shopping/order/submitMergeProgress", body={"batchId": args.batch_id}))


def cmd_merge_submit_result(args):
    _out(_api_call("POST", "/shopping/order/submitMergeResult", body={"batchId": args.batch_id}))


# ── Freight / Logistics ───────────────────────────────────────────────────

def cmd_freight_calculate(args):
    products = _parse_json_or_file(args.products)
    body = {"startCountryCode": args.from_cc, "endCountryCode": args.to_cc, "products": products}
    _out(_api_call("POST", "/logistic/freightCalculate", body=body))


def cmd_freight_calculate_tip(args):
    products = _parse_json_or_file(args.products)
    body = {"reqDTOS": [{"srcAreaCode": args.from_cc, "destAreaCode": args.to_cc,
                         "freightTrialSkuList": products}]}
    _out(_api_call("POST", "/logistic/freightCalculateTip", body=body))


def cmd_freight_partner(args):
    products = _parse_json_or_file(args.products)
    body = {"orderNumber": args.order_num, "shippingCountryCode": args.country_code,
            "shippingCountry": args.country, "shippingProvince": args.province,
            "shippingCity": args.city, "shippingZip": args.zip,
            "fromCountryCode": args.from_cc, "products": products}
    _out(_api_call("POST", "/logistic/partnerFreightCalculate", body=body))


def cmd_freight_supplier_self(args):
    products = _parse_json_or_file(args.products)
    body = {"startCountryCode": args.from_cc, "endCountryCode": args.to_cc, "products": products}
    _out(_api_call("POST", "/logistic/supplierSelfShipmentFreightCalculate", body=body))


# ── Tracking ──────────────────────────────────────────────────────────────

def cmd_tracking_info(args):
    _out(_api_call("GET", "/logistic/trackInfo", params={"orderId": args.order_id}))


def cmd_tracking_info_v2(args):
    _out(_api_call("GET", "/logistic/trackInfoV2", params={"orderId": args.order_id}))


# ── Disputes ──────────────────────────────────────────────────────────────

def cmd_dispute_products(args):
    _out(_api_call("GET", "/disputes/disputeProducts", params={"orderId": args.order_id}))


def cmd_dispute_confirm(args):
    items = _parse_json_or_file(args.items)
    _out(_api_call("POST", "/disputes/disputeConfirmInfo", body={
        "orderId": args.order_id, "productInfoList": items}))


def cmd_dispute_create(args):
    body = {"orderId": args.order_id, "businessDisputeId": args.business_id,
            "disputeReasonId": args.reason_id, "expectType": args.expect_type,
            "refundType": args.refund_type, "messageText": args.message}
    _out(_api_call("POST", "/disputes/create", body=body))


def cmd_dispute_cancel(args):
    _out(_api_call("POST", "/disputes/cancel", body={
        "orderId": args.order_id, "disputeId": args.dispute_id}))


def cmd_dispute_list(args):
    params = {}
    if args.page_num:
        params["pageNum"] = args.page_num
    if args.page_size:
        params["pageSize"] = args.page_size
    _out(_api_call("GET", "/disputes/getDisputeList", params=params))


def cmd_dispute_detail(args):
    _out(_api_call("GET", "/disputes/getDisputeDetail", params={"disputeId": args.dispute_id}))


# ── Webhooks ──────────────────────────────────────────────────────────────

def cmd_webhook_set(args):
    callback_url = args.callback_url
    topic_type = "ENABLE" if True else "CANCEL"
    body = {}
    for topic in ["product", "stock", "order", "logistics"]:
        flag = getattr(args, f"enable_{topic}", True)
        body[topic] = {"type": "ENABLE" if flag else "CANCEL", "callbackUrls": [callback_url]}
    _out(_api_call("POST", "/webhook/set", body=body))


def cmd_webhook_subscribe(args):
    body = {}
    if args.product_ids:
        body["productIds"] = args.product_ids.split(",")
    if args.subscribe_all:
        body["subscribeAll"] = True
    _out(_api_call("POST", "/webhook/product/subscribe", body=body))


def cmd_webhook_unsubscribe(args):
    _out(_api_call("POST", "/webhook/product/unsubscribe", body={
        "productIds": args.product_ids.split(",")}))


def cmd_webhook_subscribed_list(args):
    params = {}
    if args.page_num:
        params["pageNum"] = args.page_num
    if args.page_size:
        params["pageSize"] = args.page_size
    _out(_api_call("GET", "/webhook/product/subscribe/list", params=params))


# ── Shop ──────────────────────────────────────────────────────────────────

def cmd_shop_list(args):
    _out(_api_call("GET", "/shop/getShops"))


def cmd_shop_save_product(args):
    body = {"id": args.id, "title": args.title, "image": args.image}
    if args.description:
        body["description"] = args.description
    _out(_api_call("POST", "/store/product/saveProduct", body=body))


def cmd_shop_save_variants(args):
    variants = _parse_json_or_file(args.variants)
    _out(_api_call("POST", "/store/product/saveVariantBatch", body={"variants": variants}))


# ── Argument Parser ────────────────────────────────────────────────────────

def build_parser():
    parser = argparse.ArgumentParser(prog="cj-cli", description="CJ Dropshipping API CLI")
    sub = parser.add_subparsers(dest="command")

    # ── Auth ──
    auth = sub.add_parser("auth")
    auth_sub = auth.add_subparsers(dest="subcommand")
    auth_sub.add_parser("get-token").set_defaults(func=cmd_auth_get_token)
    auth_sub.add_parser("refresh-token").set_defaults(func=cmd_auth_refresh_token)
    auth_sub.add_parser("logout").set_defaults(func=cmd_auth_logout)

    # ── Setting ──
    setting = sub.add_parser("setting")
    setting_sub = setting.add_subparsers(dest="subcommand")
    setting_sub.add_parser("get").set_defaults(func=cmd_setting_get)

    # ── Product ──
    prod = sub.add_parser("product")
    prod_sub = prod.add_subparsers(dest="subcommand")

    p = prod_sub.add_parser("categories"); p.set_defaults(func=cmd_product_categories)

    p = prod_sub.add_parser("list")
    p.add_argument("--page-num", type=int); p.add_argument("--page-size", type=int)
    p.add_argument("--category-id"); p.add_argument("--pid"); p.add_argument("--product-sku")
    p.add_argument("--product-name"); p.add_argument("--product-name-en"); p.add_argument("--country-code")
    p.add_argument("--delivery-time"); p.add_argument("--min-price", type=float)
    p.add_argument("--max-price", type=float); p.add_argument("--sort"); p.add_argument("--order-by")
    p.set_defaults(func=cmd_product_list)

    p = prod_sub.add_parser("list-v2")
    p.add_argument("--keyword"); p.add_argument("--page", type=int); p.add_argument("--size", type=int)
    p.add_argument("--category-id"); p.add_argument("--country-code")
    p.add_argument("--start-price", type=float); p.add_argument("--end-price", type=float)
    p.add_argument("--free-shipping", type=int); p.add_argument("--sort")
    p.add_argument("--order-by", type=int); p.add_argument("--features")
    p.add_argument("--product-flag", type=int)
    p.set_defaults(func=cmd_product_list_v2)

    p = prod_sub.add_parser("detail"); p.add_argument("--pid", required=True)
    p.set_defaults(func=cmd_product_detail)

    p = prod_sub.add_parser("warehouses"); p.set_defaults(func=cmd_product_warehouses)

    p = prod_sub.add_parser("add"); p.add_argument("--pid", required=True)
    p.set_defaults(func=cmd_product_add)

    p = prod_sub.add_parser("my-products"); p.add_argument("--page-num", type=int); p.add_argument("--page-size", type=int)
    p.set_defaults(func=cmd_product_my_products)

    p = prod_sub.add_parser("variants"); p.add_argument("--pid", required=True)
    p.set_defaults(func=cmd_product_variants)

    p = prod_sub.add_parser("variant-by-vid"); p.add_argument("--vid", required=True)
    p.set_defaults(func=cmd_product_variant_by_vid)

    p = prod_sub.add_parser("stock"); p.add_argument("--vid", required=True)
    p.set_defaults(func=cmd_product_stock)

    p = prod_sub.add_parser("stock-by-sku"); p.add_argument("--sku", required=True)
    p.set_defaults(func=cmd_product_stock_by_sku)

    p = prod_sub.add_parser("stock-by-pid"); p.add_argument("--pid", required=True)
    p.set_defaults(func=cmd_product_stock_by_pid)

    p = prod_sub.add_parser("reviews"); p.add_argument("--pid", required=True)
    p.add_argument("--page-num", type=int); p.add_argument("--page-size", type=int)
    p.set_defaults(func=cmd_product_reviews)

    p = prod_sub.add_parser("sourcing-create"); p.add_argument("--name", required=True)
    p.add_argument("--image", required=True); p.add_argument("--link", required=True)
    p.set_defaults(func=cmd_product_sourcing_create)

    p = prod_sub.add_parser("sourcing-query"); p.add_argument("--keyword")
    p.set_defaults(func=cmd_product_sourcing_query)

    p = prod_sub.add_parser("connections"); p.add_argument("--page-num", type=int); p.add_argument("--page-size", type=int)
    p.set_defaults(func=cmd_product_connections)

    p = prod_sub.add_parser("connect"); p.add_argument("--pid", required=True)
    p.add_argument("--sku", required=True); p.add_argument("--store-sku", required=True)
    p.set_defaults(func=cmd_product_connect)

    p = prod_sub.add_parser("disconnect"); p.add_argument("--pid", required=True)
    p.set_defaults(func=cmd_product_disconnect)

    p = prod_sub.add_parser("videos"); p.add_argument("--pid", required=True)
    p.set_defaults(func=cmd_product_videos)

    p = prod_sub.add_parser("image-search"); p.add_argument("--image-url", required=True)
    p.set_defaults(func=cmd_product_image_search)

    # ── Warehouse ──
    wh = sub.add_parser("warehouse")
    wh_sub = wh.add_subparsers(dest="subcommand")
    p = wh_sub.add_parser("detail"); p.add_argument("--id", required=True)
    p.set_defaults(func=cmd_warehouse_detail)

    # ── Private Inventory ──
    pi = sub.add_parser("private-inventory")
    pi_sub = pi.add_subparsers(dest="subcommand")

    p = pi_sub.add_parser("spu-page"); p.add_argument("--keyword")
    p.add_argument("--page-num", type=int); p.add_argument("--page-size", type=int)
    p.add_argument("--available-stock", action="store_true")
    p.set_defaults(func=cmd_pi_spu_page)

    p = pi_sub.add_parser("sku-list"); p.add_argument("--product-id", required=True)
    p.add_argument("--keyword")
    p.set_defaults(func=cmd_pi_sku_list)

    p = pi_sub.add_parser("sku-detail"); p.add_argument("--sku")
    p.add_argument("--page-num", type=int); p.add_argument("--page-size", type=int)
    p.add_argument("--available-stock", action="store_true")
    p.set_defaults(func=cmd_pi_sku_detail)

    p = pi_sub.add_parser("sku-batch"); p.add_argument("--sku", required=True)
    p.set_defaults(func=cmd_pi_sku_batch)

    p = pi_sub.add_parser("sku-flow"); p.add_argument("--sku")
    p.add_argument("--page-num", type=int); p.add_argument("--page-size", type=int)
    p.set_defaults(func=cmd_pi_sku_flow)

    p = pi_sub.add_parser("warehouse-pictures"); p.add_argument("--order-ids", required=True)
    p.set_defaults(func=cmd_pi_warehouse_pictures)

    # ── Orders ──
    order = sub.add_parser("order")
    order_sub = order.add_subparsers(dest="subcommand")

    def _add_order_args(p):
        p.add_argument("--order-num", required=True)
        p.add_argument("--country-code", required=True); p.add_argument("--country", required=True)
        p.add_argument("--province", required=True); p.add_argument("--city", required=True)
        p.add_argument("--address", required=True); p.add_argument("--customer-name", required=True)
        p.add_argument("--logistic-name", required=True); p.add_argument("--from-country-code", required=True)
        p.add_argument("--products", required=True, help="JSON array or file path: [{vid,quantity}]")
        p.add_argument("--shipping-zip"); p.add_argument("--shipping-phone"); p.add_argument("--shipping-address2")
        p.add_argument("--house-number"); p.add_argument("--email"); p.add_argument("--remark")
        p.add_argument("--tax-id"); p.add_argument("--shop-amount", type=float); p.add_argument("--platform")
        p.add_argument("--ioss-type", type=int); p.add_argument("--ioss-number")
        p.add_argument("--pay-type", type=int); p.add_argument("--shop-logistics-type", type=int)
        p.add_argument("--storage-id"); p.add_argument("--order-flow", type=int); p.add_argument("--store-name")

    p = order_sub.add_parser("create-v2"); _add_order_args(p); p.set_defaults(func=cmd_order_create_v2)
    p = order_sub.add_parser("create-v3"); _add_order_args(p); p.set_defaults(func=cmd_order_create_v3)

    p = order_sub.add_parser("add-cart"); p.add_argument("--order-ids", required=True)
    p.set_defaults(func=cmd_order_add_cart)

    p = order_sub.add_parser("add-cart-confirm"); p.add_argument("--order-id", required=True)
    p.set_defaults(func=cmd_order_add_cart_confirm)

    p = order_sub.add_parser("save-parent"); p.add_argument("--order-ids", required=True)
    p.set_defaults(func=cmd_order_save_parent)

    p = order_sub.add_parser("list"); p.add_argument("--page-num", type=int); p.add_argument("--page-size", type=int)
    p.set_defaults(func=cmd_order_list)

    p = order_sub.add_parser("detail"); p.add_argument("--order-id", required=True)
    p.set_defaults(func=cmd_order_detail)

    p = order_sub.add_parser("delete"); p.add_argument("--order-id", required=True)
    p.set_defaults(func=cmd_order_delete)

    p = order_sub.add_parser("confirm"); p.add_argument("--order-id", required=True)
    p.set_defaults(func=cmd_order_confirm)

    p = order_sub.add_parser("change-warehouse"); p.add_argument("--order-id", required=True)
    p.add_argument("--storage-id", required=True)
    p.set_defaults(func=cmd_order_change_warehouse)

    p = order_sub.add_parser("sandbox-pay"); p.add_argument("--order-id", required=True)
    p.set_defaults(func=cmd_order_sandbox_pay)

    p = order_sub.add_parser("sandbox-status"); p.add_argument("--order-id", required=True)
    p.add_argument("--status", required=True)
    p.set_defaults(func=cmd_order_sandbox_status)

    # ── Balance ──
    bal = sub.add_parser("balance")
    bal_sub = bal.add_subparsers(dest="subcommand")
    bal_sub.add_parser("get").set_defaults(func=cmd_balance_get)
    p = bal_sub.add_parser("pay"); p.add_argument("--order-id", required=True); p.set_defaults(func=cmd_balance_pay)
    p = bal_sub.add_parser("pay-v2"); p.add_argument("--order-ids", required=True); p.set_defaults(func=cmd_balance_pay_v2)

    # ── Shipping ──
    ship = sub.add_parser("shipping")
    ship_sub = ship.add_subparsers(dest="subcommand")
    p = ship_sub.add_parser("upload"); p.add_argument("--order-id", required=True)
    p.add_argument("--tracking", required=True); p.add_argument("--carrier", required=True)
    p.set_defaults(func=cmd_shipping_upload)
    p = ship_sub.add_parser("update"); p.add_argument("--order-id", required=True)
    p.add_argument("--tracking", required=True); p.add_argument("--carrier", required=True)
    p.set_defaults(func=cmd_shipping_update)
    p = ship_sub.add_parser("update-pod"); p.add_argument("--order-id", required=True)
    p.add_argument("--images", required=True, help="Comma-separated image URLs")
    p.set_defaults(func=cmd_shipping_update_pod)

    # ── COGS ──
    cogs = sub.add_parser("cogs")
    cogs_sub = cogs.add_subparsers(dest="subcommand")
    p = cogs_sub.add_parser("query"); p.add_argument("--order-ids", required=True)
    p.set_defaults(func=cmd_cogs_query)

    # ── Merge ──
    merge = sub.add_parser("merge")
    merge_sub = merge.add_subparsers(dest="subcommand")
    p = merge_sub.add_parser("auto-match"); p.add_argument("--order-ids", required=True); p.set_defaults(func=cmd_merge_auto_match)
    p = merge_sub.add_parser("auto-progress"); p.add_argument("--batch-id", required=True); p.set_defaults(func=cmd_merge_auto_progress)
    p = merge_sub.add_parser("auto-result"); p.add_argument("--batch-id", required=True); p.set_defaults(func=cmd_merge_auto_result)
    p = merge_sub.add_parser("submit-batch"); p.add_argument("--order-ids", required=True); p.set_defaults(func=cmd_merge_submit_batch)
    p = merge_sub.add_parser("submit-progress"); p.add_argument("--batch-id", required=True); p.set_defaults(func=cmd_merge_submit_progress)
    p = merge_sub.add_parser("submit-result"); p.add_argument("--batch-id", required=True); p.set_defaults(func=cmd_merge_submit_result)

    # ── Freight ──
    freight = sub.add_parser("freight")
    freight_sub = freight.add_subparsers(dest="subcommand")
    p = freight_sub.add_parser("calculate"); p.add_argument("--from", dest="from_cc", required=True)
    p.add_argument("--to", dest="to_cc", required=True); p.add_argument("--products", required=True)
    p.set_defaults(func=cmd_freight_calculate)
    p = freight_sub.add_parser("calculate-tip"); p.add_argument("--from", dest="from_cc", required=True)
    p.add_argument("--to", dest="to_cc", required=True); p.add_argument("--products", required=True)
    p.set_defaults(func=cmd_freight_calculate_tip)
    p = freight_sub.add_parser("partner"); p.add_argument("--order-num", required=True)
    p.add_argument("--country-code", required=True); p.add_argument("--country", required=True)
    p.add_argument("--province", required=True); p.add_argument("--city", required=True)
    p.add_argument("--zip", required=True); p.add_argument("--from", dest="from_cc", required=True)
    p.add_argument("--products", required=True)
    p.set_defaults(func=cmd_freight_partner)
    p = freight_sub.add_parser("supplier-self"); p.add_argument("--from", dest="from_cc", required=True)
    p.add_argument("--to", dest="to_cc", required=True); p.add_argument("--products", required=True)
    p.set_defaults(func=cmd_freight_supplier_self)

    # ── Tracking ──
    track = sub.add_parser("tracking")
    track_sub = track.add_subparsers(dest="subcommand")
    p = track_sub.add_parser("info"); p.add_argument("--order-id", required=True); p.set_defaults(func=cmd_tracking_info)
    p = track_sub.add_parser("info-v2"); p.add_argument("--order-id", required=True); p.set_defaults(func=cmd_tracking_info_v2)

    # ── Dispute ──
    disp = sub.add_parser("dispute")
    disp_sub = disp.add_subparsers(dest="subcommand")
    p = disp_sub.add_parser("products"); p.add_argument("--order-id", required=True); p.set_defaults(func=cmd_dispute_products)
    p = disp_sub.add_parser("confirm"); p.add_argument("--order-id", required=True)
    p.add_argument("--items", required=True); p.set_defaults(func=cmd_dispute_confirm)
    p = disp_sub.add_parser("create"); p.add_argument("--order-id", required=True)
    p.add_argument("--business-id", required=True); p.add_argument("--reason-id", type=int, required=True)
    p.add_argument("--expect-type", type=int, required=True); p.add_argument("--refund-type", type=int, required=True)
    p.add_argument("--message", required=True); p.set_defaults(func=cmd_dispute_create)
    p = disp_sub.add_parser("cancel"); p.add_argument("--order-id", required=True)
    p.add_argument("--dispute-id", required=True); p.set_defaults(func=cmd_dispute_cancel)
    p = disp_sub.add_parser("list"); p.add_argument("--page-num", type=int); p.add_argument("--page-size", type=int)
    p.set_defaults(func=cmd_dispute_list)
    p = disp_sub.add_parser("detail"); p.add_argument("--dispute-id", required=True); p.set_defaults(func=cmd_dispute_detail)

    # ── Webhook ──
    wh = sub.add_parser("webhook")
    wh_sub = wh.add_subparsers(dest="subcommand")
    p = wh_sub.add_parser("set"); p.add_argument("--callback-url", required=True)
    p.add_argument("--enable-product", action="store_true", default=True)
    p.add_argument("--enable-stock", action="store_true", default=True)
    p.add_argument("--enable-order", action="store_true", default=True)
    p.add_argument("--enable-logistics", action="store_true", default=True)
    p.set_defaults(func=cmd_webhook_set)
    p = wh_sub.add_parser("subscribe"); p.add_argument("--product-ids")
    p.add_argument("--subscribe-all", action="store_true"); p.set_defaults(func=cmd_webhook_subscribe)
    p = wh_sub.add_parser("unsubscribe"); p.add_argument("--product-ids", required=True)
    p.set_defaults(func=cmd_webhook_unsubscribe)
    p = wh_sub.add_parser("subscribed-list"); p.add_argument("--page-num", type=int)
    p.add_argument("--page-size", type=int); p.set_defaults(func=cmd_webhook_subscribed_list)

    # ── Shop ──
    shop = sub.add_parser("shop")
    shop_sub = shop.add_subparsers(dest="subcommand")
    shop_sub.add_parser("list").set_defaults(func=cmd_shop_list)
    p = shop_sub.add_parser("save-product"); p.add_argument("--id", required=True)
    p.add_argument("--title", required=True); p.add_argument("--image", required=True)
    p.add_argument("--description"); p.set_defaults(func=cmd_shop_save_product)
    p = shop_sub.add_parser("save-variants"); p.add_argument("--variants", required=True)
    p.set_defaults(func=cmd_shop_save_variants)

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()
    if hasattr(args, "func"):
        args.func(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
