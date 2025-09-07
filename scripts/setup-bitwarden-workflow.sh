#!/bin/bash
# Bitwarden + ChezMoi + Cloudflare Secrets Management Setup Script
# This script sets up a complete secure workflow for API key management

set -e

echo "🔐 Bitwarden + ChezMoi + Cloudflare Secrets Workflow Setup"
echo "======================================================"

# Check if we're running with sudo (we don't want that for user setup)
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root. Please run as your regular user."
   exit 1
fi

# Function to check for required commands
check_dependencies() {
    echo "📋 Checking dependencies..."

    local missing_tools=()

    if ! command -v bw &> /dev/null; then
        missing_tools+=("bitwarden-cli")
        echo "❌ Bitwarden CLI not found. Install with: npm install -g @bitwarden/cli"
    else
        echo "✅ Bitwarden CLI is installed"
    fi

    if ! command -v chezmoi &> /dev/null; then
        missing_tools+=("chezmoi")
        echo "❌ ChezMoi not found. Install from https://chezmoi.io"
    else
        echo "✅ ChezMoi is installed"
    fi

    if ! command -v git &> /dev/null; then
        missing_tools+=("git")
        echo "❌ Git not found. Install with: sudo apt install git"
    else
        echo "✅ Git is installed"
    fi

    if [ ${#missing_tools[@]} -ne 0 ]; then
        echo "❌ Missing required tools: ${missing_tools[*]}"
        echo "Please install them and run this script again."
        exit 1
    fi
}

# Function to authenticate with Bitwarden
setup_bitwarden() {
    echo ""
    echo "🔑 Setting up Bitwarden authentication..."

    if ! bw login --check > /dev/null 2>&1; then
        echo "🔓 Not authenticated with Bitwarden. Let's authenticate..."
        echo "Please visit https://vault.bitwarden.com or your self-hosted instance"
        bw login

        if [ $? -ne 0 ]; then
            echo "❌ Bitwarden authentication failed"
            exit 1
        fi
    else
        echo "✅ Already authenticated with Bitwarden"
    fi

    # Unlock vault
    echo "🔓 Unlocking Bitwarden vault..."
    BW_SESSION="$(bw unlock --raw)"

    if [ $? -ne 0 ] || [ -z "$BW_SESSION" ]; then
        echo "❌ Failed to unlock Bitwarden vault"
        exit 1
    fi

    export BW_SESSION
    echo "✅ Bitwarden vault unlocked successfully"
}

# Function to create required Bitwarden items
create_bitwarden_entries() {
    echo ""
    echo "📝 Creating required Bitwarden entries..."
    echo "Note: This will create secure items in your Bitwarden vault."

    # Cloudflare Account ID and API Token
    echo "🌐 Setting up Cloudflare secrets..."
    if ! bw get item "Cloudflare Account ID" > /dev/null 2>&1; then
        echo "Creating Cloudflare Account ID item..."
        bw create item --name "Cloudflare Account ID" --field account_id "your-cloudflare-account-id"
    fi

    if ! bw get item "Cloudflare API Token" > /dev/null 2>&1; then
        echo "Creating Cloudflare API Token item..."
        bw create item --name "Cloudflare API Token" --field api_token "your-cloudflare-api-token"
    fi

    # Supabase Configuration
    echo "🗄️ Setting up Supabase secrets..."
    if ! bw get item "Supabase OpenDiscourse" > /dev/null 2>&1; then
        echo "Creating Supabase OpenDiscourse item..."
        cat << EOF | bw create item --name "Supabase OpenDiscourse" --field url "https://your-project.supabase.co" --field anon_key "your-anon-key" --field service_role_key "your-service-role-key"
{
  "name": "Supabase OpenDiscourse",
  "fields": [
    {"name": "url", "value": "https://your-project.supabase.co"},
    {"name": "anon_key", "value": "your-anon-key"},
    {"name": "service_role_key": "your-service-role-key"}
  ]
}
EOF
    fi

    # API Keys
    echo "🔑 Setting up API keys..."
    if ! bw get item "GOVINFO API Key" > /dev/null 2>&1; then
        bw create item --name "GOVINFO API Key" --notes "API key from https://api.govinfo.gov/signup/"
    fi

    if ! bw get item "OpenAI API Key" > /dev/null 2>&1; then
        bw create item --name "OpenAI API Key" --notes "OpenAI API key from https://platform.openai.com"
    fi

    # Security Secrets
    echo "🔒 Setting up security secrets..."
    if ! bw get item "Session Secret" > /dev/null 2>&1; then
        # Generate a random session secret
        SESSION_SECRET=$(openssl rand -hex 32)
        bw create item --name "Session Secret" --notes "$SESSION_SECRET"
    fi

    if ! bw get item "JWT Secret" > /dev/null 2>&1; then
        # Generate a random JWT secret
        JWT_SECRET=$(openssl rand -hex 64)
        bw create item --name "JWT Secret" --notes "$JWT_SECRET"
    fi

    echo ""
    echo "🎉 Bitwarden items created successfully!"
    echo "⚠️  IMPORTANT: Edit each item in your Bitwarden vault to add the actual values!"
}

# Function to update the ChezMoi configuration
update_chezmoi_config() {
    echo ""
    echo "🔧 Updating ChezMoi configuration for Bitwarden integration..."

    # Update chezmoi.toml to add Bitwarden template processing
    cat >> /home/$USER/.config/chezmoi/chezmoi.toml << EOF

# Bitwarden template settings
[bitwarden]
    command = "bw"
    unlock = true

EOF

    echo "✅ ChezMoi configuration updated"
}

# Function to create .env template in ChezMoi
setup_env_template() {
    echo ""
    echo "📂 Setting up .env template in ChezMoi..."

    local chezmoi_source="/home/$USER/.local/share/chezmoi"

    # Copy the template to ChezMoi source directory
    cp ".env.bitwarden-template" "$chezmoi_source/private_dot_env.bitwarden"

    # Create a chezmoi template that processes the Bitwarden template
    cat > "$chezmoi_source/private_dot_env" << 'EOF'
#!/bin/bash
# Secure environment variables via Bitwarden + ChezMoi
# This file is managed by chezmoi and should not be edited manually

{{- $bitwarden := includeTemplate ".env.bitwarden-template" }}
{{ $bitwarden -}}
EOF

    echo "✅ Environment template set up in ChezMoi"
}

# Function to test the workflow
test_workflow() {
    echo ""
    echo "🧪 Testing the workflow..."

    # Test ChezMoi can process the template
    echo "Testing ChezMoi template processing..."
    chezmoi cat ".env" > /dev/null

    if [ $? -ne 0 ]; then
        echo "❌ ChezMoi template processing failed"
        exit 1
    fi

    echo "✅ Template processing successful"
    echo "🎯 Workflow is ready to use!"
}

# Function to provide user guidance
show_instructions() {
    echo ""
    echo "📚 Bitwarden + ChezMoi Workflow Setup Complete!"
    echo "=============================================="
    echo ""
    echo "🎉 Your secure secrets management workflow is now configured!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Open Bitwarden and edit the items created above with your real API keys"
    echo "2. Run: chezmoi apply"
    echo "3. Your .env file will be securely populated from Bitwarden"
    echo ""
    echo "🔒 Security Benefits:"
    echo "• API keys are never stored in plain text in your repository"
    echo "• Secrets are managed through encrypted Bitwarden vault"
    echo "• Automated sync via ChezMoi across all your machines"
    echo "• No risk of accidentally committing secrets"
    echo ""
    echo "🛠️  Usage:"
    echo "• Add new secrets: bw create item --name 'New Secret' --field value 'secret-value'"
    echo "• Update secrets: bw edit item 'Secret Name'"
    echo "• Sync changes: chezmoi apply"
    echo "• View encrypted secrets: chezmoi cat .env"
}

# Main execution flow
main() {
    check_dependencies

    echo ""
    echo "🚀 Beginning Bitwarden + ChezMoi + Cloudflare workflow setup..."
    echo "This will set up a secure way to manage your API keys and secrets."
    echo ""
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi

    setup_bitwarden
    create_bitwarden_entries
    update_chezmoi_config
    setup_env_template
    test_workflow
    show_instructions
}

# Run main function
main "$@"
