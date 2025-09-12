#!/bin/bash

# Docker 容器启动脚本
# 
# 这个脚本用于在 Docker 容器中启动 SvelteKit 应用，主要功能包括：
# - 清理并重新安装依赖包
# - 修复 Rollup 原生模块的架构兼容性问题
# - 启动开发服务器

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
