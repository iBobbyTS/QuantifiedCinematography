import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { user, brands, productTypes, productSeries } from './schema';
import { sql } from 'drizzle-orm';
import { hashPassword } from '../../password';

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

	try {
		// 生成密码哈希
		const adminPasswordHash = await hashPassword('admin123');
		const testPasswordHash = await hashPassword('test123');

		// 使用事务确保数据一致性
		await db.transaction(async (tx) => {
			// 1. 插入基础产品类型
			await tx.insert(productTypes).values({
				name: 'None'
			}).onConflictDoNothing();

			// 2. 插入基础品牌
			await tx.insert(brands).values({
				name: 'None'
			}).onConflictDoNothing();

			// 3. 插入基础产品系列
			await tx.insert(productSeries).values({
				name: 'None',
				brandId: 1, // 假设brands表从1开始
				productTypeId: 1 // 假设productTypes表从1开始
			}).onConflictDoNothing();

			// 4. 插入/更新管理员用户
			await tx.insert(user).values({
				username: 'admin',
				nickname: 'Administrator',
				email: 'admin@quantifiedcinematography.com',
				passwordHash: adminPasswordHash,
				permission: 2147483647 // 所有权限: bits 0-30 全部设为1 (0x7FFFFFFF)
			}).onConflictDoUpdate({
				target: user.username,
				set: {
					passwordHash: adminPasswordHash,
					nickname: 'Administrator',
					email: 'admin@quantifiedcinematography.com',
					permission: 2147483647,
					updatedAt: new Date()
				}
			});

			// 5. 插入/更新测试用户
			await tx.insert(user).values({
				username: 'test',
				nickname: 'Test User',
				email: 'test@quantifiedcinematography.com',
				passwordHash: testPasswordHash,
				permission: 1 // 只有LIGHT权限
			}).onConflictDoUpdate({
				target: user.username,
				set: {
					passwordHash: testPasswordHash,
					nickname: 'Test User',
					email: 'test@quantifiedcinematography.com',
					permission: 1,
					updatedAt: new Date()
				}
			});

			// 6. 重置序列以确保未来插入从1开始
			await tx.execute(sql`SELECT setval('product_types_id_seq', 1, false)`);
			await tx.execute(sql`SELECT setval('brands_id_seq', 1, false)`);
			await tx.execute(sql`SELECT setval('product_series_id_seq', 1, false)`);
		});

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
