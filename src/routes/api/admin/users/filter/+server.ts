import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { and, or, like, eq, sql } from 'drizzle-orm';
import { USER_PERMISSIONS } from '$lib/permission/bitmask.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { search, status, permissions, permissionMatchMode, pagination } = body;

		console.log('=== Filter API Request ===');
		console.log('Request body:', body);
		console.log('Search query:', search);
		console.log('Status filter:', status);
		console.log('Permissions filter:', permissions);
		console.log('Permission match mode:', permissionMatchMode);
		console.log('Pagination:', pagination);

		// 构建查询条件
		let conditions = [];

		// 搜索条件：模糊搜索用户名、昵称、邮箱
		if (search && search.trim()) {
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
		if (status && status.length > 0) {
			const statusConditions = [];
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
		if (permissions && permissions.length > 0) {
			const matchMode = permissionMatchMode || 'any'; // 默认为 'any'
			console.log('Permission match mode:', matchMode);
			
			// 检查是否选择了"无权限"
			if (permissions.includes('none')) {
				// 无权限：permission = 0
				conditions.push(eq(user.permission, 0));
			} else {
				// 有权限的情况
				if (matchMode === 'all') {
					// All 模式：用户必须拥有所有选中的权限
					const allPermissionConditions = [];
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
					// Any 模式：用户拥有任意一个选中的权限
					const anyPermissionConditions = [];
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

		// 分页参数
		const page = pagination?.page || 1;
		const limit = pagination?.limit || 10;
		const offset = (page - 1) * limit;

		// 执行查询
		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
		
		console.log('=== Query Conditions ===');
		console.log('Conditions count:', conditions.length);
		console.log('Where clause:', whereClause);
		console.log('Page:', page, 'Limit:', limit, 'Offset:', offset);
		
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
			.limit(limit)
			.offset(offset);

		console.log('=== Query Results ===');
		console.log('Filtered users count:', filteredUsers.length);
		console.log('Filtered users:', filteredUsers);

        // 获取总数用于分页（正确的 count(*) 聚合）
        const totalCountRows = await db
            .select({ count: sql<number>`count(*)` })
            .from(user)
            .where(whereClause);

        const totalCount = totalCountRows?.[0]?.count ?? 0;
        console.log('=== Total Count ===');
        console.log('Total count:', totalCount);

        const response = {
			success: true,
			users: filteredUsers,
			pagination: {
				page,
				limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit)
			}
		};

		console.log('=== Final Response ===');
		console.log('Response:', response);

		return json(response);

	} catch (error) {
		console.error('Filter users error:', error);
		return json(
			{
				success: false,
				error: 'Failed to filter users'
			},
			{ status: 500 }
		);
	}
};
