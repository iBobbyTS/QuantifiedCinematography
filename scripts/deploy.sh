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

echo "Step 2: Pull latest code from GitHub..."
cd "$PROJECT_DIR" || exit 1

# Fetch and checkout deploy branch
git fetch origin
git checkout deploy
git pull origin deploy

echo "Step 3: Run database migrations (if needed)..."
# Uncomment if you need database migrations
# docker compose -f docker-compose.prod.yml run --rm app bun run db:migrate

echo "Step 4: Build and restart application with Docker..."
# Restart using docker-compose if using Docker
if [ -f docker-compose.prod.yml ]; then
  echo "Using production docker-compose configuration..."
  docker compose -f docker-compose.prod.yml down || true
  docker compose -f docker-compose.prod.yml up -d --build
  echo "Application restarted using Docker Compose (production)"
elif [ -f docker-compose.yml ]; then
  echo "Using default docker-compose configuration..."
  docker compose down || true
  docker compose up -d --build
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
