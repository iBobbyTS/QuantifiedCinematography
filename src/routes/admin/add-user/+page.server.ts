import { error, redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '$lib/permission/bitmask.js';
import { hashPassword, generatePassword } from '$lib/password.js';
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
	createUser: async ({ request, locals }) => {
		// 检查用户是否登录
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		// 检查用户是否为管理员
		if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.ADMINISTRATOR)) {
			return fail(403, { message: 'Access denied. Administrator permission required.' });
		}

		try {
			const formData = await request.formData();
			const username = formData.get('username') as string;
			const permissions = parseInt(formData.get('permissions') as string) || 0;

		// 验证输入
			if (!username) {
				return fail(400, { message: 'Username is required' });
		}

		if (username.length < 3) {
				return fail(400, { message: 'Username must be at least 3 characters long' });
		}

			// 检查用户名是否已存在
			const existingUser = await db.select().from(user).where(eq(user.username, username));
			if (existingUser.length > 0) {
				return fail(400, { message: 'Username already exists' });
			}

			// 生成随机密码
			const plainPassword = generatePassword(12); // 12位随机密码
			const passwordHash = await hashPassword(plainPassword);

			// 生成默认昵称（使用用户名）
			const nickname = username;

			// 生成默认邮箱（使用用户名@quantifiedcinematography.com）
			const email = `${username}@quantifiedcinematography.com`;

			// 创建新用户
			await db.insert(user).values({
				username,
				nickname,
				email,
				passwordHash,
				permission: permissions,
				disabled: 0 // 新用户默认启用
			});

			// 返回成功结果和生成的密码
			return {
				success: true,
				username,
				password: plainPassword
			};

		} catch (err) {
			console.error('Failed to create user:', err);
			return fail(500, { message: 'Failed to create user' });
		}
	}
};
