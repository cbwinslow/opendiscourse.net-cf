# Infrastructure Quickstart

This document outlines the steps to configure Terraform, CI/CD, and backups for the OpenDiscourse Cloudflare deployment.

## 1. Terraform

- Install Terraform v1.5+.
- Create `terraform/terraform.tfvars` with `cloudflare_api_token` and `cloudflare_account_id`.

Run:

```bash
cd terraform
terraform init
terraform apply
```

## 2. CI/CD (GitHub Actions)

 - Add `CLOUDFLARE_API_TOKEN` secret to the GitHub repository.
 - Workflow `/.github/workflows/deploy.yml` will run on pushes to `main` and
	 publish via Wrangler.

## 3. Backups

 - `scripts/backup_d1_to_r2.sh` is a starter script to upload a backup artifact to
	 R2 using `wrangler r2 object put`.
 - Schedule it via a cron-based GitHub Action or an external scheduler.

## Notes & Next steps

 - Replace placeholder resources in `terraform/main.tf` with exact resource types
	 and add `account_id` where required.
 - Implement automatic D1 exports (Cloudflare's D1 may need custom export via a
	 worker or admin API).
 - Add IAM and scoped API tokens for least privilege.
 
