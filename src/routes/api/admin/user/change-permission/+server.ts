import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '$lib/permission/bitmask.js';
import { eq } from 'drizzle-orm';

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
		const { userId, permissions } = await request.json();

		// 验证输入
		if (!userId || typeof permissions !== 'number') {
			throw error(400, { message: 'Invalid input: userId and permissions are required' });
		}

		// 检查用户是否存在
		const existingUser = await db.select().from(user).where(eq(user.id, userId));
		if (existingUser.length === 0) {
			throw error(404, { message: 'User not found' });
		}

		// 更新用户权限
		await db.update(user)
			.set({ 
				permission: permissions,
				updatedAt: new Date()
			})
			.where(eq(user.id, userId));

		return json({ 
			success: true, 
			message: 'User permissions updated successfully' 
		});

	} catch (err) {
		console.error('Error updating user permissions:', err);
		
		if (err instanceof Error && err.message.includes('Invalid input')) {
			throw error(400, { message: err.message });
		}
		
		throw error(500, { message: 'Internal server error' });
	}
};
