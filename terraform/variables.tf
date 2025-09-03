// Terraform variables for Cloudflare resources

variable "cloudflare_api_token" {
  description = "Cloudflare API token with permissions to manage Workers, Pages, D1, R2, KV"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "project_name" {
  description = "Name for resources"
  type        = string
  default     = "opendiscourse"
}
