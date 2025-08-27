import { error, redirect } from '@sveltejs/kit';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { db } from '../../db/config.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '../../lib/auth/password.js';
import { lucia } from '../../lib/server/auth.js';

export const load: ServerLoad = async ({ locals }) => {
	// 如果用户已经登录，重定向到首页
	if (locals.user) {
		throw redirect(302, '/');
	}
	
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('username') as string;
		const password = data.get('password') as string;
		
		// 验证输入
		if (!username || !password) {
			throw error(400, { message: '用户名和密码不能为空' });
		}
		
		// 从数据库查找用户
		const userResult = await db.select().from(users).where(eq(users.username, username));
		
		if (userResult.length === 0) {
			throw error(404, { message: '用户不存在' });
		}
		
		const user = userResult[0];
		
		// 验证密码
		const isPasswordValid = await verifyPassword(password, user.passwordHash);
		
		if (!isPasswordValid) {
			throw error(401, { message: '密码错误' });
		}
		
		// 使用Lucia创建session
		const session = await lucia.createSession(user.id, {});
		const sessionCookie = lucia.createSessionCookie(session.id);
		
		// 设置session cookie
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: ".",
			...sessionCookie.attributes
		});
		
		// 重定向到首页
		throw redirect(302, '/');
	}
};
