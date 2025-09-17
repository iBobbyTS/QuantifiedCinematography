#!/bin/bash

# Docker 容器启动脚本
# 
# 这个脚本用于在 Docker 容器中启动 SvelteKit 应用，主要功能包括：
# - 清理并重新安装依赖包
# - 修复 Rollup 原生模块的架构兼容性问题
# - 启动开发服务器


# Install dependencies
echo "Installing dependencies with bun..."
bun install

# Compile ParaglideJS messages
echo "Compiling ParaglideJS messages..."
bun run paraglide-js

# Start the development server
echo "Starting development server..."
bun run dev --host 0.0.0.0 --port 5173
