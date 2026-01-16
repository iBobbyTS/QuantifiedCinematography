import { error, redirect, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user, session } from '$lib/server/db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '$lib/permission/bitmask.js';
import { and, or, like, eq, sql, desc } from 'drizzle-orm';

export const load: ServerLoad = async ({ locals }) => {
	// 检查用户是否登录
	if (!locals.user) {
		throw redirect(302, '/user/login');
	}

	// 检查用户是否为管理员
	if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.ADMINISTRATOR)) {
		throw error(403, { message: 'Access denied. Administrator permission required.' });
	}

	try {
		// Don't load user data in load function, let frontend request it based on localStorage
		// Return empty array, frontend will request data with proper pagination
		return {
			users: []
		};
	} catch (err) {
		console.error('Failed to load users:', err);
		throw error(500, { message: 'Failed to load users' });
	}
};

export const actions: Actions = {
    filter: async ({ request, locals }) => {
        // 必须登录且为管理员
        if (!locals.user) {
            return fail(401, { message: 'Unauthorized' });
        }
        if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.ADMINISTRATOR)) {
            return fail(403, { message: 'Insufficient permissions' });
        }

        try {
            // 同时兼容 JSON 和 FormData(payload)
            let payload: any = null;
            const contentType = request.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                payload = await request.json();
            } else {
                const form = await request.formData();
                const raw = form.get('payload');
                if (typeof raw === 'string') {
                    try { payload = JSON.parse(raw); } catch {}
                }
            }

            const { search, status, permissions, permissionMatchMode, sort, pagination } = payload || {};

            // 构建查询条件
            const conditions: any[] = [];

            // 搜索条件：模糊搜索用户名、昵称、邮箱
            if (search && typeof search === 'string' && search.trim()) {
                const searchTerm = `%${search.trim()}%`;
                conditions.push(
                    or(
                        like(user.username, searchTerm),
                        like(user.nickname, searchTerm),
                        like(user.email, searchTerm)
                    )
                );
            }

            // 状态过滤：根据启用/禁用状态
            if (Array.isArray(status) && status.length > 0) {
                const statusConditions: any[] = [];
                if (status.includes('enabled')) {
                    statusConditions.push(eq(user.disabled, 0));
                }
                if (status.includes('disabled')) {
                    statusConditions.push(eq(user.disabled, 1));
                }
                if (statusConditions.length > 0) {
                    conditions.push(or(...statusConditions));
                }
            }

            // 权限过滤：根据用户权限（位掩码）
            if (Array.isArray(permissions) && permissions.length > 0) {
                const matchMode: 'any' | 'all' = permissionMatchMode === 'all' ? 'all' : 'any';

                // 检查是否选择了"无权限"
                if (permissions.includes('none')) {
                    conditions.push(eq(user.permission, 0));
                } else {
                    if (matchMode === 'all') {
                        const allPermissionConditions: any[] = [];
                        if (permissions.includes('light')) {
                            allPermissionConditions.push(sql`(${user.permission} & ${USER_PERMISSIONS.LIGHT}) > 0`);
                        }
                        if (permissions.includes('camera')) {
                            allPermissionConditions.push(sql`(${user.permission} & ${USER_PERMISSIONS.CAMERA}) > 0`);
                        }
                        if (permissions.includes('lens')) {
                            allPermissionConditions.push(sql`(${user.permission} & ${USER_PERMISSIONS.LENS}) > 0`);
                        }
                        if (permissions.includes('admin')) {
                            allPermissionConditions.push(sql`(${user.permission} & ${USER_PERMISSIONS.ADMINISTRATOR}) > 0`);
                        }
                        if (allPermissionConditions.length > 0) {
                            conditions.push(and(...allPermissionConditions));
                        }
                    } else {
                        const anyPermissionConditions: any[] = [];
                        if (permissions.includes('light')) {
                            anyPermissionConditions.push(sql`(${user.permission} & ${USER_PERMISSIONS.LIGHT}) > 0`);
                        }
                        if (permissions.includes('camera')) {
                            anyPermissionConditions.push(sql`(${user.permission} & ${USER_PERMISSIONS.CAMERA}) > 0`);
                        }
                        if (permissions.includes('lens')) {
                            anyPermissionConditions.push(sql`(${user.permission} & ${USER_PERMISSIONS.LENS}) > 0`);
                        }
                        if (permissions.includes('admin')) {
                            anyPermissionConditions.push(sql`(${user.permission} & ${USER_PERMISSIONS.ADMINISTRATOR}) > 0`);
                        }
                        if (anyPermissionConditions.length > 0) {
                            conditions.push(or(...anyPermissionConditions));
                        }
                    }
                }
            }

            // 分页
            const page = pagination?.page || 1;
            const limit = pagination?.limit || 10;
            const offset = (page - 1) * limit;

            // 排序
            let orderByClause: any[] = [];
            if (sort && sort.field && sort.direction) {
                const isAsc = sort.direction === 'asc';
                switch (sort.field) {
                    case 'status':
                        orderByClause = isAsc ? [user.disabled] : [desc(user.disabled)];
                        break;
                    case 'permission':
                        orderByClause = isAsc ? [user.permission] : [desc(user.permission)];
                        break;
                    case 'username':
                        orderByClause = isAsc ? [user.username] : [desc(user.username)];
                        break;
                    case 'nickname':
                        orderByClause = isAsc ? [user.nickname] : [desc(user.nickname)];
                        break;
                    case 'email':
                        orderByClause = isAsc ? [user.email] : [desc(user.email)];
                        break;
                    default:
                        orderByClause = [user.disabled, user.permission, user.username, user.nickname, user.email];
                }
            } else {
                // 默认排序：状态, 权限, 用户名, 昵称, 邮箱
                orderByClause = [user.disabled, user.permission, user.username, user.nickname, user.email];
            }

            const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

            const filteredUsers = await db
                .select({
                    id: user.id,
                    username: user.username,
                    nickname: user.nickname,
                    email: user.email,
                    permission: user.permission,
                    disabled: user.disabled,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                })
                .from(user)
                .where(whereClause)
                .orderBy(...orderByClause)
                .limit(limit)
                .offset(offset);

            const totalCountRows = await db
                .select({ count: sql<number>`count(*)` })
                .from(user)
                .where(whereClause);
            const total = totalCountRows?.[0]?.count ?? 0;

            return {
                success: true,
                users: filteredUsers,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (err) {
            console.error('Filter action error:', err);
            return fail(500, { message: 'Failed to filter users' });
        }
    },
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

            // Transaction: delete all sessions then delete user
            await db.transaction(async (tx) => {
                await tx.delete(session).where(eq(session.userId, userId));
                await tx.delete(user).where(eq(user.id, userId));
            });

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

            // Transaction: update disabled status and (if disabling) delete all sessions
            await db.transaction(async (tx) => {
                await tx
                    .update(user)
                    .set({ 
                        disabled: disabled ? 1 : 0,
                        updatedAt: new Date()
                    })
                    .where(eq(user.id, userId));

                if (disabled) {
                    await tx.delete(session).where(eq(session.userId, userId));
                }
            });

            return { success: true, userId, disabled };
        } catch (err) {
            console.error('Error updating user disable status:', err);
            return fail(500, { message: 'Failed to update user status' });
        }
    },

    changePermission: async ({ request, locals }) => {
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
            const permissions = parseInt(String(form.get('permissions') || '0'));

            if (!userId) {
                return fail(400, { message: 'User ID is required' });
            }

            if (typeof permissions !== 'number' || isNaN(permissions)) {
                return fail(400, { message: 'Invalid permissions value' });
            }

            // Check existence
            const existing = await db.select().from(user).where(eq(user.id, userId)).limit(1);
            if (existing.length === 0) {
                return fail(404, { message: 'User not found' });
            }

            // Update permissions
            await db
                .update(user)
                .set({ 
                    permission: permissions,
                    updatedAt: new Date()
                })
                .where(eq(user.id, userId));

            return { success: true, userId, permissions };
        } catch (err) {
            console.error('Error updating user permissions:', err);
            return fail(500, { message: 'Failed to update user permissions' });
        }
	}
};
