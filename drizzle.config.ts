/**
 * Drizzle ORM 数据库配置文件
 * 
 * 这个文件配置了 Drizzle 数据库 ORM 工具，包括：
 * - 数据库连接配置（PostgreSQL）
 * - 数据库模式文件路径
 * - 数据库迁移和生成设置
 * - 环境变量验证
 */

import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL },
	verbose: true,
	strict: true
});
