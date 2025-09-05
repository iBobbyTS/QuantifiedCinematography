import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '../../../../../db/config.js';
import { users } from '../../../../../db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '../../../../../lib/bitmask.js';
import { hashPassword } from '../../../../../lib/auth/password.js';
import { eq } from 'drizzle-orm';
import { generatePassword } from '../../../../../lib/auth/password.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	// 检查用户是否登录
	if (!locals.user) {
		throw error(401, { message: 'Unauthorized' });
	}

	// 检查用户是否为管理员
	if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.ADMINISTRATOR)) {
		throw error(403, { message: 'Access denied. Administrator permission required.' });
	}

	try {
		const { username, permissions } = await request.json();

		// 验证输入
		if (!username || permissions === undefined) {
			throw error(400, { message: 'Username and permissions are required' });
		}

		if (username.length < 3) {
			throw error(400, { message: 'Username must be at least 3 characters long' });
		}

		// 检查用户名是否已存在
		const existingUser = await db.select().from(users).where(eq(users.username, username));
		if (existingUser.length > 0) {
			throw error(400, { message: 'Username already exists' });
		}

		// 生成随机密码
		const plainPassword = generatePassword(12); // 12位随机密码
		const passwordHash = await hashPassword(plainPassword);

		// 生成默认昵称（使用用户名）
		const nickname = username;

		// 生成默认邮箱（使用用户名@quantifiedcinematography.com）
		const email = `${username}@quantifiedcinematography.com`;

		// 创建新用户
		await db.insert(users).values({
			username,
			nickname,
			email,
			passwordHash,
			permission: permissions || 0
		});

		// 返回生成的密码
		return json({
			success: true,
			username,
			password: plainPassword
		});

	} catch (err) {
		console.error('Failed to create user:', err);
		
		if (err instanceof Error && err.message.includes('already exists')) {
			throw error(400, { message: err.message });
		}
		
		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		
		throw error(500, { message: 'Failed to create user' });
	}
};
