# CI/CD Workflows

This directory contains GitHub Actions workflows for the OpenDiscourse project.

## Available Workflows

### 1. CI Base (`ci-base.yml`)
- **Trigger**: On push to main/develop or pull requests
- **Purpose**:
  - Lint TypeScript and Python code
  - Run unit tests
  - Generate code coverage reports
  - Upload coverage to Codecov

### 2. Security Scan (`security-scan.yml`)
- **Trigger**: On push to main/develop, pull requests, and weekly
- **Checks**:
  - Secret detection with Gitleaks
  - Dependency vulnerability scanning (npm audit, pip-audit)
  - Container vulnerability scanning with Trivy
  - Static Application Security Testing (SAST) with Bandit

### 3. Code Review (`code-review.yml`)
- **Trigger**: On pull requests
- **Features**:
  - Conventional commits check
  - PR title format validation
  - Large file detection
  - Merge conflict detection
  - TODO comment tracking
  - Code owners review
  - PR size labeling
  - Auto-request reviews

### 4. Deployment Workflows

#### Base Deployment (`deploy-base.yml`)
A reusable workflow for container deployments.

#### API Service (`deploy-api.yml`)
- **Manual Trigger**: `workflow_dispatch` with environment selection
- **Auto Trigger**: On push to main when API code changes
- **Features**:
  - Builds and pushes Docker image
  - Deploys to specified environment
  - Sends deployment notifications

#### Cloudflare Worker (`deploy-worker.yml`)
- **Manual Trigger**: `workflow_dispatch` with environment selection
- **Auto Trigger**: On push to main when worker code changes
- **Features**:
  - Builds and deploys Cloudflare Worker
  - Environment-specific configuration
  - Deployment verification

### 5. Monitoring (`monitoring.yml`)
- **Trigger**: Every 30 minutes and after deployments
- **Features**:
  - System health checks
  - Deployment notifications
  - Status reporting to Slack

## Usage

### Manual Deployment
1. Go to GitHub Actions
2. Select the deployment workflow (e.g., "Deploy API Service")
3. Click "Run workflow"
4. Select the environment (staging/production)
5. Click "Run workflow"

### Environment Variables
Required secrets:
- `DOCKERHUB_TOKEN`: Docker Hub access token
- `DOCKERHUB_USERNAME`: Docker Hub username
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token
- `SLACK_WEBHOOK`: Slack incoming webhook URL

### Customization
1. Update environment-specific configurations in the respective workflow files
2. Add new deployment workflows by copying and modifying existing ones
3. Update notification settings in the monitoring workflow

## Best Practices
1. Always test in staging before deploying to production
2. Monitor the "Deployments" tab in GitHub for deployment status
3. Check Slack for deployment notifications and system health reports
4. Review security scan reports regularly
5. Keep dependencies up to date using Dependabot
