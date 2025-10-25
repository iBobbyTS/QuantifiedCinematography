import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { UserPermissions } from '$lib/permission/bitmask.js';
import { USER_PERMISSIONS } from '$lib/permission/bitmask.js';
import { generatePassword, hashPassword } from '$lib/password.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	// 检查用户是否已登录
	if (!locals.user) {
		throw error(401, { message: 'Unauthorized' });
	}

	// 检查用户是否有管理员权限
	if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.ADMINISTRATOR)) {
		throw error(403, { message: 'Insufficient permissions' });
	}

	try {
		const { userId } = await request.json();

		// 验证输入
		if (!userId) {
			throw error(400, { message: 'User ID is required' });
		}

		// 检查用户是否存在
		const existingUser = await db.select().from(user).where(eq(user.id, userId)).limit(1);
		if (existingUser.length === 0) {
			throw error(404, { message: 'User not found' });
		}

		// 生成新密码
		const newPassword = generatePassword();
		const hashedPassword = await hashPassword(newPassword);

		// 更新用户密码
		await db
			.update(user)
			.set({ 
				passwordHash: hashedPassword,
				updatedAt: new Date()
			})
			.where(eq(user.id, userId));

		return json({ 
			success: true, 
			message: 'Password reset successfully',
			password: newPassword
		});

	} catch (err) {
		console.error('Error resetting password:', err);
		throw error(500, { message: 'Internal server error' });
	}
};
