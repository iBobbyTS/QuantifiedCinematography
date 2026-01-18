#!/bin/bash

# Server setup script
# Run this script on your Linux server to prepare the deployment environment

set -e

echo "=========================================="
echo "Server Setup for Quantified Cinematography"
echo "=========================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "⚠ Please do not run this script as root. Use a regular user with sudo privileges."
   exit 1
fi

echo "Step 1: Installing Docker..."
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    # For Ubuntu/Debian
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y docker.io docker-compose-plugin
        sudo systemctl enable docker
        sudo systemctl start docker
        sudo usermod -aG docker $USER
        echo "✓ Docker installed. Please log out and log back in for group changes to take effect."
    # For CentOS/RHEL
    elif command -v yum &> /dev/null; then
        sudo yum install -y docker docker-compose-plugin
        sudo systemctl enable docker
        sudo systemctl start docker
        sudo usermod -aG docker $USER
        echo "✓ Docker installed. Please log out and log back in for group changes to take effect."
    else
        echo "⚠ Please install Docker manually: https://docs.docker.com/engine/install/"
        exit 1
    fi
else
    echo "✓ Docker already installed"
fi

echo "Step 2: Setting up SSH key for GitHub Actions..."
if [ ! -f ~/.ssh/id_ed25519 ]; then
    ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/id_ed25519 -N ""
    echo "✓ SSH key generated"
    echo ""
    echo "⚠ IMPORTANT: Add the following public key to ~/.ssh/authorized_keys:"
    echo ""
    cat ~/.ssh/id_ed25519.pub
    echo ""
    echo "And add the private key (~/.ssh/id_ed25519) to GitHub Secrets as DEPLOY_SSH_KEY"
else
    echo "✓ SSH key already exists"
fi

echo "Step 3: Creating project directory..."
PROJECT_DIR="${1:-/opt/quantified-cinematography}"
if [ ! -d "$PROJECT_DIR" ]; then
    sudo mkdir -p "$PROJECT_DIR"
    sudo chown $USER:$USER "$PROJECT_DIR"
    echo "✓ Project directory created: $PROJECT_DIR"
else
    echo "✓ Project directory already exists: $PROJECT_DIR"
fi

echo "Step 4: Creating backup directory..."
BACKUP_DIR="/opt/backups/quantified-cinematography"
sudo mkdir -p "$BACKUP_DIR"
sudo chown $USER:$USER "$BACKUP_DIR"
echo "✓ Backup directory created: $BACKUP_DIR"

echo ""
echo "=========================================="
echo "Setup completed!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Clone your repository:"
echo "   cd $PROJECT_DIR"
echo "   git clone <your-repo-url> ."
echo "   git checkout deploy"
echo ""
echo "2. Configure environment variables:"
echo "   cp .env.example .env"
echo "   # Edit .env with your production settings"
echo ""
echo "3. Make deploy script executable:"
echo "   chmod +x scripts/deploy.sh"
echo ""
echo "4. Configure GitHub Secrets:"
echo "   - DEPLOY_HOST: $(hostname -I | awk '{print $1}')"
echo "   - DEPLOY_USER: $USER"
echo "   - DEPLOY_SSH_KEY: (content of ~/.ssh/id_ed25519)"
echo "   - DEPLOY_PORT: 22"
echo "   - DEPLOY_PATH: $PROJECT_DIR"
echo ""
echo "5. Test deployment:"
echo "   ./scripts/deploy.sh"
echo ""
