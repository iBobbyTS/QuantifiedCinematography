#!/bin/bash

# 数据库初始化脚本
# 这个脚本会创建数据库表并插入种子数据

echo "🚀 开始初始化数据库..."

# 1. 生成迁移文件
echo "📝 生成数据库迁移文件..."
bun run db:generate

# 2. 推送schema到数据库
echo "📤 推送数据库schema..."
bun run db:push

# 3. 插入种子数据
echo "🌱 插入种子数据..."
bun run db:seed

echo "✅ 数据库初始化完成！"
