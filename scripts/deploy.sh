#!/bin/bash

# Production deployment script
# This script is executed on the server after GitHub Actions triggers deployment

set -e  # Exit on error

echo "Starting deployment..."

# Configuration
PROJECT_DIR="${DEPLOY_PATH:-/opt/QuantifiedCinematography}"

# Change to project directory
cd "$PROJECT_DIR" || {
  echo "Error: Project directory $PROJECT_DIR does not exist"
  exit 1
}

# Pull latest code
echo "Pulling latest code..."
git pull origin deploy

# Detect which docker compose command is available
if command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
  DOCKER_COMPOSE_CMD="docker compose"
else
  echo "Error: docker-compose or 'docker compose' not found"
  exit 1
fi

# Build and restart application
echo "Stopping containers..."
if [ -f docker-compose.prod.yml ]; then
  $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml down || true
  echo "Building and starting containers..."
  $DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d --build
else
  $DOCKER_COMPOSE_CMD down || true
  echo "Building and starting containers..."
  $DOCKER_COMPOSE_CMD up -d --build
fi

echo "Deployment completed!"
