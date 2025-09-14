// Terraform main to create D1, R2, KV, and Workers (starter)
// This file sketches resources and should be customized per environment. Check provider docs for exact resource types.

locals {
  name = var.project_name
}

// Example: R2 bucket
resource "cloudflare_r2_bucket" "documents" {
  account_id = var.cloudflare_account_id
  name       = "${local.name}-documents"
  // Add lifecycle rules and versioning as needed
}

// Example: Workers KV namespace
resource "cloudflare_workers_kv_namespace" "metadata" {
  title = "${local.name}-metadata"
  account_id = var.cloudflare_account_id
}

// Example: Pages project placeholder - requires manual linking via Cloudflare UI or API
// resource "cloudflare_pages_project" "frontend" {
//   account_id = var.cloudflare_account_id
//   name       = "${local.name}-pages"
// }

// Example: D1 Database (Cloudflare's terraform support may be limited; use provider if available)
// resource "cloudflare_d1_database" "db" {
//   // placeholder
// }

// Workers script upload is typically handled by Wrangler; include a null_resource to call wrangler if desired in pipelines.
resource "null_resource" "deploy_placeholder" {
  triggers = {
    always_run = timestamp()
  }
}

output "r2_bucket_name" {
  value = cloudflare_r2_bucket.documents.name
}

output "kv_namespace_title" {
  value = cloudflare_workers_kv_namespace.metadata.title
}
