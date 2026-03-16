resource "cloudflare_ruleset" "checkout_protection" {
  zone_id     = var.cloudflare_zone_id
  name        = "Checkout Bot Protection"
  description = "Block known bots from checkout APIs"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules {
    action      = "managed_challenge"
    description = "Challenge automated requests to checkout"
    expression  = "(http.request.uri.path matches \"^/api/checkout\" or http.request.uri.path matches \"^/checkout\") and cf.bot_management.score < 30"
  }

  rules {
    action      = "block"
    description = "Block malicious bots completely"
    expression  = "cf.threat_score > 50 and http.request.uri.path matches \"^/api/checkout\""
  }
}
