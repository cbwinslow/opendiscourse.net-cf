// Terraform provider configuration for Cloudflare
// NOTE: This is a starter template. Fill values via CLI or `terraform.tfvars` and secure state backend.

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 3.0"
    }
  }
}

provider "cloudflare" {
  // Best practice: set these from environment variables or tfvars
  // CF_API_TOKEN: Cloudflare API token with scoped permissions
  api_token = var.cloudflare_api_token
  account_id = var.cloudflare_account_id
}
