import { error, redirect, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { spectrometer } from '$lib/server/db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '$lib/permission/bitmask.js';
import { and, like, eq, not } from 'drizzle-orm';

export const load: ServerLoad = async ({ locals }) => {
	// 检查用户是否登录
	if (!locals.user) {
		throw redirect(302, '/user/login');
	}

	// 检查用户是否有灯光权限（光谱仪管理需要灯光权限）
	if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.LIGHT)) {
		throw error(403, { message: 'Access denied. Light permission required.' });
	}

	try {
		// 获取所有光谱仪，按名字排序，只返回前端需要的字段（id 和 name）
		const allSpectrometers = await db.select({
			id: spectrometer.id,
			name: spectrometer.name
		}).from(spectrometer).orderBy(spectrometer.name);

		return {
			spectrometers: allSpectrometers
		};
	} catch (err) {
		console.error('Failed to load spectrometers:', err);
		throw error(500, { message: 'Failed to load spectrometers' });
	}
};

export const actions: Actions = {
	filter: async ({ request, locals }) => {
		// 必须登录且有灯光权限
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}
		if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.LIGHT)) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		try {
			const formData = await request.formData();
			const payloadStr = formData.get('payload');
			if (!payloadStr || typeof payloadStr !== 'string') {
				return fail(400, { message: 'Invalid payload' });
			}

			let payload: any;
			try {
				payload = JSON.parse(payloadStr);
			} catch {
				return fail(400, { message: 'Invalid JSON payload' });
			}

			const { search } = payload || {};

			// 构建查询条件
			const conditions: any[] = [];

			// 模糊搜索：只有当 search 存在且不为空字符串时才添加搜索条件
			if (search && typeof search === 'string' && search.trim().length > 0) {
				conditions.push(like(spectrometer.name, `%${search.trim()}%`));
			}

			// 如果 conditions 为空，whereClause 为 undefined，将返回所有数据
			const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

			// 只选择前端需要的字段（id 和 name），不返回 Date 对象避免序列化问题
			const filteredSpectrometers = await db
				.select({
					id: spectrometer.id,
					name: spectrometer.name
				})
				.from(spectrometer)
				.where(whereClause)
				.orderBy(spectrometer.name);

			return { success: true, spectrometers: filteredSpectrometers };
		} catch (err) {
			console.error('Filter spectrometers error:', err);
			return fail(500, { message: 'Failed to filter spectrometers' });
		}
	},

	rename: async ({ request, locals }) => {
		// 必须登录且有灯光权限
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}
		if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.LIGHT)) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		try {
			const formData = await request.formData();
			const spectrometerId = String(formData.get('spectrometerId') || '');
			const newName = String(formData.get('name') || '').trim();

			if (!spectrometerId) {
				return fail(400, { message: 'Spectrometer ID is required' });
			}

			if (!newName) {
				return fail(400, { message: 'Spectrometer name is required' });
			}

			// 检查光谱仪是否存在
			const existingSpectrometer = await db
				.select()
				.from(spectrometer)
				.where(eq(spectrometer.id, parseInt(spectrometerId)))
				.limit(1);

			if (existingSpectrometer.length === 0) {
				return fail(404, { message: 'Spectrometer not found' });
			}

			// 如果名称没有改变，直接允许
			if (existingSpectrometer[0].name === newName) {
				// 名称相同，无需检查重复
			} else {
				// 检查是否有其他光谱仪使用相同名称（排除当前光谱仪）
				const duplicateCheck = await db
					.select()
					.from(spectrometer)
					.where(and(
						eq(spectrometer.name, newName),
						not(eq(spectrometer.id, parseInt(spectrometerId)))
					))
					.limit(1);

				if (duplicateCheck.length > 0) {
					return fail(400, { message: 'A spectrometer with this name already exists' });
				}
			}

			// 更新光谱仪名称
			await db
				.update(spectrometer)
				.set({ name: newName, updatedAt: new Date() })
				.where(eq(spectrometer.id, parseInt(spectrometerId)));

			return { success: true, spectrometerId, name: newName };
		} catch (err) {
			console.error('Rename spectrometer error:', err);
			return fail(500, { message: 'Failed to rename spectrometer' });
		}
	},

	delete: async ({ request, locals }) => {
		// 必须登录且有灯光权限
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}
		if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.LIGHT)) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		try {
			const formData = await request.formData();
			const spectrometerId = String(formData.get('spectrometerId') || '');

			if (!spectrometerId) {
				return fail(400, { message: 'Spectrometer ID is required' });
			}

			// 检查光谱仪是否存在
			const existingSpectrometer = await db
				.select()
				.from(spectrometer)
				.where(eq(spectrometer.id, parseInt(spectrometerId)))
				.limit(1);

			if (existingSpectrometer.length === 0) {
				return fail(404, { message: 'Spectrometer not found' });
			}

			// 删除光谱仪
			await db
				.delete(spectrometer)
				.where(eq(spectrometer.id, parseInt(spectrometerId)));

			return { success: true, spectrometerId };
		} catch (err) {
			console.error('Delete spectrometer error:', err);
			return fail(500, { message: 'Failed to delete spectrometer' });
		}
	},

	add: async ({ request, locals }) => {
		// 必须登录且有灯光权限
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}
		if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.LIGHT)) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		try {
			const formData = await request.formData();
			const name = String(formData.get('name') || '').trim();

			if (!name) {
				return fail(400, { message: 'Spectrometer name is required' });
			}

			// 检查名称是否已存在
			const existingSpectrometer = await db
				.select()
				.from(spectrometer)
				.where(eq(spectrometer.name, name))
				.limit(1);

			if (existingSpectrometer.length > 0) {
				return fail(400, { message: 'A spectrometer with this name already exists' });
			}

			// 添加光谱仪
			const [newSpectrometer] = await db
				.insert(spectrometer)
				.values({ name })
				.returning({
					id: spectrometer.id,
					name: spectrometer.name,
					createdAt: spectrometer.createdAt,
					updatedAt: spectrometer.updatedAt
				});

			return { success: true, spectrometer: newSpectrometer };
		} catch (err) {
			console.error('Add spectrometer error:', err);
			return fail(500, { message: 'Failed to add spectrometer' });
		}
	}
};

