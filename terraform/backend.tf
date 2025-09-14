// Terraform backend guidance
// This file intentionally leaves backend configuration commented as an example.
// For production, configure remote state (S3, Terraform Cloud, or similar).

// Example AWS S3 backend (uncomment and configure if using S3):
// terraform {
//   backend "s3" {
//     bucket = "my-terraform-state-bucket"
//     key    = "opendiscourse/terraform.tfstate"
//     region = "us-east-1"
//   }
// }

// For small teams you can use local backend during development.
terraform {
  required_version = ">= 1.3"
}
