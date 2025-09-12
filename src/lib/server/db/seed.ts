import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { user, brands, productTypes, productSeries } from './schema.js';
import { sql } from 'drizzle-orm';

// 直接使用环境变量，不依赖SvelteKit
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema: { user, brands, productTypes, productSeries } });

/**
 * 数据库种子数据初始化脚本
 * 这个脚本用于在数据库创建后插入初始数据
 */
export async function seedDatabase() {
	console.log('🌱 开始初始化数据库种子数据...');

	try {
		// 使用事务确保数据一致性
		await db.transaction(async (tx) => {
			// 1. 插入基础产品类型
			console.log('📦 插入产品类型...');
			await tx.insert(productTypes).values({
				name: 'None'
			}).onConflictDoNothing();

			// 2. 插入基础品牌
			console.log('🏷️ 插入品牌...');
			await tx.insert(brands).values({
				name: 'None'
			}).onConflictDoNothing();

			// 3. 插入基础产品系列
			console.log('📋 插入产品系列...');
			await tx.insert(productSeries).values({
				name: 'None',
				brandId: 1, // 假设brands表从1开始
				productTypeId: 1 // 假设productTypes表从1开始
			}).onConflictDoNothing();

			// 4. 插入管理员用户
			console.log('👤 插入管理员用户...');
			await tx.insert(user).values({
				username: 'admin',
				nickname: 'Administrator',
				email: 'admin@quantifiedcinematography.com',
				passwordHash: '$2b$12$77uo6iqUdnZnIeUrwkYsluXEfv.9JpkEyjwG1OhpXK.acD2nCHSc2', // admin123
				permission: 2147483647 // 所有权限: bits 0-30 全部设为1 (0x7FFFFFFF)
			}).onConflictDoNothing();

			// 5. 插入测试用户
			console.log('🧪 插入测试用户...');
			await tx.insert(user).values({
				username: 'test',
				nickname: 'Test User',
				email: 'test@quantifiedcinematography.com',
				passwordHash: '$2b$12$mBsOvQmuNAH2aZOo2GZmQeZK4tXosMmSGaBnoYTYiBG7A2PJmM6Eu', // test123
				permission: 1 // 只有LIGHT权限
			}).onConflictDoNothing();

			// 6. 重置序列以确保未来插入从1开始
			console.log('🔄 重置序列...');
			await tx.execute(sql`SELECT setval('product_types_id_seq', 1, false)`);
			await tx.execute(sql`SELECT setval('brands_id_seq', 1, false)`);
			await tx.execute(sql`SELECT setval('product_series_id_seq', 1, false)`);
		});

		console.log('✅ 数据库种子数据初始化完成！');
	} catch (error) {
		console.error('❌ 数据库种子数据初始化失败:', error);
		throw error;
	}
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
	await seedDatabase();
	process.exit(0);
}
