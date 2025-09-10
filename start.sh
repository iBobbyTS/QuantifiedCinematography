#!/bin/bash

# Remove node_modules and reinstall to fix rollup native module issue
echo "Removing node_modules and reinstalling dependencies..."
rm -rf node_modules
rm -f package-lock.json

# Install dependencies
echo "Installing dependencies with bun..."
bun install

# Force install rollup for the correct architecture
echo "Installing rollup for linux-arm64..."
bun add @rollup/rollup-linux-arm64-gnu

# Start the development server
echo "Starting development server..."
bun run dev --host 0.0.0.0 --port 5173
