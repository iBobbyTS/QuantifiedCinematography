import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '$lib/permission/bitmask.js';
import { hashPassword } from '$lib/password.js';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
		// 检查用户是否登录
		if (!locals.user) {
			throw redirect(302, '/user/login');
		}

	// 检查用户是否为管理员
	if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.ADMINISTRATOR)) {
		throw error(403, { message: 'Access denied. Administrator permission required.' });
	}

	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		// 检查用户是否登录
		if (!locals.user) {
			throw redirect(302, '/user/login');
		}

		// 检查用户是否为管理员
		if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.ADMINISTRATOR)) {
			throw error(403, { message: 'Access denied. Administrator permission required.' });
		}

		const data = await request.formData();
		const username = data.get('username') as string;
		const nickname = data.get('nickname') as string;
		const email = data.get('email') as string;
		const password = data.get('password') as string;
		const permission = parseInt(data.get('permission') as string) || 0;

		// 验证输入
		if (!username || !nickname || !email || !password) {
			throw error(400, { message: 'All fields are required' });
		}

		if (username.length < 3) {
			throw error(400, { message: 'Username must be at least 3 characters long' });
		}

		if (password.length < 6) {
			throw error(400, { message: 'Password must be at least 6 characters long' });
		}

		try {
			// 检查用户名是否已存在
			const existingUser = await db.select().from(user).where(eq(user.username, username));
			if (existingUser.length > 0) {
				throw error(400, { message: 'Username already exists' });
			}

			// 检查邮箱是否已存在
			const existingEmail = await db.select().from(user).where(eq(user.email, email));
			if (existingEmail.length > 0) {
				throw error(400, { message: 'Email already exists' });
			}

			// 哈希密码
			const passwordHash = await hashPassword(password);

			// 创建新用户
			await db.insert(user).values({
				username,
				nickname,
				email,
				passwordHash,
				permission
			});

			// 重定向到管理用户页面
			throw redirect(302, '/admin/manage-users');
		} catch (err) {
			if (err instanceof Error && err.message.includes('already exists')) {
				throw error(400, { message: err.message });
			}
			console.error('Failed to create user:', err);
			throw error(500, { message: 'Failed to create user' });
		}
	}
};
