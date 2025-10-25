import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '$lib/permission/bitmask.js';
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

	try {
		// 获取所有用户（包括disabled字段）
		const allUsers = await db.select({
			id: user.id,
			username: user.username,
			nickname: user.nickname,
			email: user.email,
			permission: user.permission,
			disabled: user.disabled,
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

export const actions: Actions = {
    deleteUser: async ({ request, locals }) => {
        // Must be logged in
        if (!locals.user) {
            return fail(401, { message: 'Unauthorized' });
        }

        // Must be admin
        if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.ADMINISTRATOR)) {
            return fail(403, { message: 'Insufficient permissions' });
        }

        try {
            const form = await request.formData();
            const userId = String(form.get('userId') || '');

            if (!userId) {
                return fail(400, { message: 'User ID is required' });
            }

            // Prevent deleting self
            if (userId === locals.user.id) {
                return fail(400, { message: 'Cannot delete your own account' });
            }

            // Check existence
            const existing = await db.select().from(user).where(eq(user.id, userId)).limit(1);
            if (existing.length === 0) {
                return fail(404, { message: 'User not found' });
            }

            // Delete
            await db.delete(user).where(eq(user.id, userId));

            return { success: true, userId };
        } catch (err) {
            console.error('Error deleting user:', err);
            return fail(500, { message: 'Failed to delete user' });
        }
    },

    disableUser: async ({ request, locals }) => {
        // Must be logged in
        if (!locals.user) {
            return fail(401, { message: 'Unauthorized' });
        }

        // Must be admin
        if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.ADMINISTRATOR)) {
            return fail(403, { message: 'Insufficient permissions' });
        }

        try {
            const form = await request.formData();
            const userId = String(form.get('userId') || '');
            const disabled = form.get('disabled') === 'true';

            if (!userId) {
                return fail(400, { message: 'User ID is required' });
            }

            // Prevent disabling self
            if (userId === locals.user.id) {
                return fail(400, { message: 'Cannot disable your own account' });
            }

            // Check existence
            const existing = await db.select().from(user).where(eq(user.id, userId)).limit(1);
            if (existing.length === 0) {
                return fail(404, { message: 'User not found' });
            }

            // Update disabled status
            await db
                .update(user)
                .set({ 
                    disabled: disabled ? 1 : 0,
                    updatedAt: new Date()
                })
                .where(eq(user.id, userId));

            return { success: true, userId, disabled };
        } catch (err) {
            console.error('Error updating user disable status:', err);
            return fail(500, { message: 'Failed to update user status' });
        }
    }
};
