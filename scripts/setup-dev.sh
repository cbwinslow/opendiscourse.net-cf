#!/bin/bash

# OpenDiscourse Development Setup Script
# This script automates the setup of the development environment

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print section headers
section() {
    echo -e "\n${BLUE}==> ${1}${NC}"
}

# Function to print success message
success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

# Function to print warning message
warning() {
    echo -e "${YELLOW}⚠️  ${1}${NC}"
}

# Function to print error message and exit
error() {
    echo -e "${RED}✗ ${1}${NC}" >&2
    exit 1
}

# Start setup
section "Starting OpenDiscourse Development Setup"

# Check for required commands
section "Checking system requirements"
REQUIRED_COMMANDS=("node" "npm" "git" "psql" "createdb" "wrangler")
MISSING_COMMANDS=()

for cmd in "${REQUIRED_COMMANDS[@]}"; do
    if ! command -v "$cmd" &> /dev/null; then
        MISSING_COMMANDS+=("$cmd")
    fi
done

if [ ${#MISSING_COMMANDS[@]} -gt 0 ]; then
    warning "The following required commands are missing:"
    for cmd in "${MISSING_COMMANDS[@]}"; do
        echo "  - $cmd"
    done
    echo -e "\nPlease install them before continuing."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v)
if [[ $NODE_VERSION != v18* && $NODE_VERSION != v20* ]]; then
    warning "Node.js 18 or higher is recommended. Found $NODE_VERSION"
    read -rp "Continue anyway? (y/n) " -n 1
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install root dependencies
section "Installing root dependencies"
if [ -f "package.json" ]; then
    npm install
    success "Root dependencies installed successfully"
else
    error "package.json not found in the current directory"
fi

# Install frontend dependencies
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    section "Installing frontend dependencies"
    cd frontend || error "Failed to enter frontend directory"
    npm install
    cd .. || error "Failed to return to root directory"
    success "Frontend dependencies installed successfully"
fi

# Set up environment variables
section "Setting up environment"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        success "Created .env file from .env.example"
    elif [ -f ".env.local" ]; then
        cp .env.local .env
        success "Created .env file from .env.local"
    else
        warning "No .env.example or .env.local found. Please create a .env file manually."
    fi
    
    if [ -f ".env" ]; then
        warning "Please edit the .env file with your configuration before starting the application."
    fi
else
    success ".env file already exists"
fi

# Setup database
section "Setting up database"
if command -v psql &> /dev/null; then
    if ! psql -lqt | cut -d \| -f 1 | grep -qw opendiscourse; then
        echo "Creating database 'opendiscourse'..."
        if createdb opendiscourse; then
            success "Database 'opendiscourse' created successfully"
        else
            warning "Failed to create database. Make sure PostgreSQL is running and you have the necessary permissions."
        fi
    else
        success "Database 'opendiscourse' already exists"
    fi
else
    warning "PostgreSQL client (psql) not found. Skipping database creation."
fi

# Run migrations
section "Running database migrations"
if command -v wrangler &> /dev/null; then
    if [ -d "migrations" ]; then
        echo "Applying database migrations..."
        if npx wrangler d1 migrations apply opendiscourse-db --local; then
            success "Database migrations applied successfully"
        else
            warning "Failed to apply database migrations"
        fi
    else
        warning "No migrations directory found. Skipping database migrations."
    fi
else
    warning "Cloudflare Wrangler not found. Skipping database migrations."
fi

# Final message
section "Setup Complete"
echo -e "${GREEN}✅ OpenDiscourse development environment is ready!${NC}"
echo -e "\nNext steps:"
echo "1. Edit the .env file with your configuration"
echo "2. Start the development server with: npm run dev"
echo -e "\nFor more information, check the documentation at ${BLUE}https://github.com/your-org/opendiscourse.net-cf${NC}"

# Create Cloudflare resources if needed
echo -e "${GREEN}Checking Cloudflare setup...${NC}"
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}Please log in to Cloudflare using 'wrangler login'${NC}
    wrangler login
fi

echo -e "${GREEN}Setup complete!${NC}"
echo -e "Next steps:"
echo "1. Edit the .env file with your API keys and configuration"
echo "2. Start the development server with 'npm run dev'"
echo "3. Access the frontend at http://localhost:3000"
