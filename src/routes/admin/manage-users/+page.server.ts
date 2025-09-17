import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '$lib/permission/bitmask.js';

export const load: PageServerLoad = async ({ locals }) => {
	// 检查用户是否登录
	if (!locals.user) {
		throw redirect(302, '/user/login');
	}

	// 检查用户是否为管理员
	if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.ADMINISTRATOR)) {
		throw error(403, { message: 'Access denied. Administrator permission required.' });
	}

	try {
		// 获取所有用户（除了当前用户）
		const allUsers = await db.select({
			id: user.id,
			username: user.username,
			nickname: user.nickname,
			email: user.email,
			permission: user.permission,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt
		}).from(user).orderBy(user.createdAt);

		return {
			users: allUsers
		};
	} catch (err) {
		console.error('Failed to load users:', err);
		throw error(500, { message: 'Failed to load users' });
	}
};
