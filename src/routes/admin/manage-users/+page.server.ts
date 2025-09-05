import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '../../../db/config.js';
import { users } from '../../../db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '../../../lib/bitmask.js';

export const load: PageServerLoad = async ({ locals }) => {
	// 检查用户是否登录
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	// 检查用户是否为管理员
	if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.ADMINISTRATOR)) {
		throw error(403, { message: 'Access denied. Administrator permission required.' });
	}

	try {
		// 获取所有用户（除了当前用户）
		const allUsers = await db.select({
			id: users.id,
			username: users.username,
			nickname: users.nickname,
			email: users.email,
			permission: users.permission,
			createdAt: users.createdAt,
			updatedAt: users.updatedAt
		}).from(users).orderBy(users.createdAt);

		return {
			users: allUsers
		};
	} catch (err) {
		console.error('Failed to load users:', err);
		throw error(500, { message: 'Failed to load users' });
	}
};
