#!/bin/bash

# Production deployment script
# This script is executed on the server after GitHub Actions triggers deployment

set -e  # Exit on error

echo "=========================================="
echo "Starting deployment..."
echo "=========================================="

# Configuration
PROJECT_DIR="${DEPLOY_PATH:-/opt/quantified-cinematography}"
BACKUP_DIR="${BACKUP_PATH:-/opt/backups/quantified-cinematography}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Step 1: Backup current deployment..."
if [ -d "$PROJECT_DIR" ]; then
  tar -czf "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" -C "$PROJECT_DIR" . 2>/dev/null || true
  echo "Backup created: backup_$TIMESTAMP.tar.gz"
fi

echo "Step 2: Ensure project directory exists and clone/pull code..."
# Create project directory if it doesn't exist
mkdir -p "$PROJECT_DIR"

# Check if it's a git repository
if [ ! -d "$PROJECT_DIR/.git" ]; then
  echo "Project directory is not a git repository. Cloning..."
  # Remove empty directory if it exists
  rmdir "$PROJECT_DIR" 2>/dev/null || true
  # Clone the repository
  # Note: You may need to set GIT_REPO_URL or use the default
  GIT_REPO_URL="${GIT_REPO_URL:-https://github.com/$(whoami)/QuantifiedCinematography.git}"
  echo "Cloning repository to $PROJECT_DIR..."
  git clone "$GIT_REPO_URL" "$PROJECT_DIR" || {
    echo "⚠ Error: Could not clone repository. Please set GIT_REPO_URL or clone manually."
    echo "Example: git clone <your-repo-url> $PROJECT_DIR"
    exit 1
  }
  cd "$PROJECT_DIR"
  git checkout deploy || git checkout -b deploy origin/deploy || true
else
  cd "$PROJECT_DIR" || exit 1
  # Fetch and checkout deploy branch
  git fetch origin
  git checkout deploy || git checkout -b deploy origin/deploy
  git pull origin deploy
fi

echo "Step 3: Run database migrations (if needed)..."
# Uncomment if you need database migrations
# Note: Use $DOCKER_COMPOSE_CMD instead of hardcoded command
# $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml run --rm app bun run db:migrate

echo "Step 4: Build and restart application with Docker..."
# Detect which docker compose command is available
if command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
  DOCKER_COMPOSE_CMD="docker compose"
else
  echo "⚠ Error: docker-compose or 'docker compose' not found"
  exit 1
fi

# Restart using docker-compose if using Docker
if [ -f docker-compose.prod.yml ]; then
  echo "Using production docker-compose configuration..."
  $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down || true
  $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d --build
  echo "Application restarted using Docker Compose (production)"
elif [ -f docker-compose.yml ]; then
  echo "Using default docker-compose configuration..."
  $DOCKER_COMPOSE_CMD down || true
  $DOCKER_COMPOSE_CMD up -d --build
  echo "Application restarted using Docker Compose"
else
  # If using PM2 or systemd, restart the service
  if command -v pm2 &> /dev/null; then
    echo "Restarting with PM2..."
    pm2 restart quantified-cinematography || pm2 start ecosystem.config.js
  elif systemctl is-active --quiet quantified-cinematography; then
    echo "Restarting with systemd..."
    sudo systemctl restart quantified-cinematography
  else
    echo "⚠ Warning: No Docker Compose configuration found."
    echo "Please ensure docker-compose.prod.yml or docker-compose.yml exists."
  fi
fi

echo "Step 5: Health check..."
sleep 5
if command -v curl &> /dev/null; then
  if curl -f http://localhost:5173 > /dev/null 2>&1; then
    echo "✓ Health check passed"
  else
    echo "⚠ Health check failed - please verify manually"
  fi
fi

echo "=========================================="
echo "Deployment completed!"
echo "=========================================="
