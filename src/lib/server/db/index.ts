import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) {
	console.error('❌ DATABASE_URL is not set');
	throw new Error('DATABASE_URL is not set');
}

console.log('🔗 初始化数据库连接...', { 
	url: env.DATABASE_URL ? 'provided' : 'missing',
	hasSchema: !!schema 
});

let client: postgres.Sql;
try {
	client = postgres(env.DATABASE_URL);
	console.log('✅ 数据库连接初始化成功');
} catch (error) {
	console.error('❌ 数据库连接初始化失败:', error);
	throw error;
}

export const db = drizzle(client, { schema });
