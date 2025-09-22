import { json, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { hashPassword, verifyPassword } from '$lib/password.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// 检查用户是否已登录
	if (!locals.user) {
		return redirect(302, '/user/login');
	}

	// 读取用户公开信息
	const rows = await db
		.select({ platform: table.userPublicInfo.platform, link: table.userPublicInfo.link })
		.from(table.userPublicInfo)
		.where(eq(table.userPublicInfo.userId, locals.user.id));

	return {
		user: locals.user,
		publicInfo: rows.map((r) => ({ platform: r.platform, link: r.link }))
	};
};

export const actions: Actions = {
	changePassword: async ({ request, locals }) => {
		// 检查用户是否已登录
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const currentPassword = formData.get('currentPassword');
		const newPassword = formData.get('newPassword');
		const confirmPassword = formData.get('confirmPassword');

		// 验证输入
		if (!validatePassword(currentPassword)) {
			return fail(400, { message: 'Invalid current password format' });
		}
		if (!validatePassword(newPassword)) {
			return fail(400, { message: 'Invalid new password format (min 6, max 255 characters)' });
		}
		if (!validatePassword(confirmPassword)) {
			return fail(400, { message: 'Invalid confirm password format' });
		}

		// 检查新密码和确认密码是否匹配
		if (newPassword !== confirmPassword) {
			return fail(400, { message: 'New password and confirm password do not match' });
		}

		// 检查新密码是否与当前密码相同
		if (currentPassword === newPassword) {
			return fail(400, { message: 'New password must be different from current password' });
		}

		try {
			// 获取用户当前密码哈希
			const [user] = await db
				.select()
				.from(table.user)
				.where(eq(table.user.id, locals.user.id));

			if (!user) {
				return fail(404, { message: 'User not found' });
			}

			// 验证当前密码
			const validCurrentPassword = await verifyPassword(user.passwordHash, currentPassword);

			if (!validCurrentPassword) {
				return fail(400, { message: 'Current password is incorrect' });
			}

			// 生成新密码哈希
			const newPasswordHash = await hashPassword(newPassword);

			// 更新密码
			await db
				.update(table.user)
				.set({
					passwordHash: newPasswordHash,
					updatedAt: new Date()
				})
				.where(eq(table.user.id, locals.user.id));

			return { success: true };

		} catch (error) {
			console.error('❌ 修改密码时发生错误:', error);
			return fail(500, { message: 'Internal server error. Please try again later.' });
		}
	}
,
    updatePublicInfo: async ({ request, locals }) => {
		// 需要登录
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		try {
			const form = await request.formData();
			const itemsField = form.get('items');
			let items: any[] = [];
			if (typeof itemsField === 'string') {
				try { items = JSON.parse(itemsField); } catch { return fail(400, { message: 'Invalid items payload' }); }
			} else if (itemsField instanceof Blob) {
				const text = await itemsField.text();
				try { items = JSON.parse(text); } catch { return fail(400, { message: 'Invalid items payload' }); }
			} else {
				return fail(400, { message: 'Missing items' });
			}

			// 允许的平台集合
			const allowed = new Set(table.platformTypeEnum.enumValues);
			const normalized = items
				.map((it: any) => ({
					platform: String(it.platform),
					link: String(it.link || '').trim()
				}))
				.filter((it: any) => allowed.has(it.platform) && it.link.length > 0);

			// 覆盖保存：先删再插
			await db.delete(table.userPublicInfo).where(eq(table.userPublicInfo.userId, locals.user.id));
			if (normalized.length > 0) {
				await db.insert(table.userPublicInfo).values(
					normalized.map((it: any) => ({ userId: locals.user.id, platform: it.platform as any, link: it.link }))
				);
			}
			return normalized.length;
		} catch (error) {
			console.error('❌ 保存信息失败:', error);
			return fail(500, { message: 'Internal server error' });
		}
	}
};

function validatePassword(password: unknown): password is string {
	return typeof password === 'string' && password.length >= 6 && password.length <= 255;
}
