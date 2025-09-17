import { fail, redirect, isRedirect } from '@sveltejs/kit';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import * as auth from '$lib/server/auth.js';
import { verify } from '@node-rs/argon2';

export const load: ServerLoad = async ({ locals }) => {
	// 如果用户已经登录，重定向到首页
	if (locals.user) {
		throw redirect(302, '/');
	}
	
	return {};
};

export const actions: Actions = {
	login: async (event) => {
		try {
			console.log('🔐 开始登录处理...');
			
			const formData = await event.request.formData();
			const username = formData.get('username');
			const password = formData.get('password');

			console.log('📝 收到登录请求:', { username: username ? 'provided' : 'missing', password: password ? 'provided' : 'missing' });

			if (!validateUsername(username)) {
				console.log('❌ 用户名验证失败:', username);
				return fail(400, {
					message: 'Invalid username (min 3, max 31 characters, alphanumeric only)'
				});
			}
			if (!validatePassword(password)) {
				console.log('❌ 密码验证失败');
				return fail(400, { message: 'Invalid password (min 6, max 255 characters)' });
			}

			console.log('🔍 查询数据库用户...');
			const results = await db.select().from(user).where(eq(user.username, username));
			console.log('📊 数据库查询结果:', results.length, '个用户');

			const existingUser = results.at(0);
			if (!existingUser) {
				console.log('❌ 用户不存在:', username);
				return fail(400, { message: 'User not found' });
			}

			console.log('🔐 验证密码...');
			const validPassword = await verify(existingUser.passwordHash, password, {
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});
			
			if (!validPassword) {
				console.log('❌ 密码验证失败');
				return fail(400, { message: 'Incorrect password' });
			}

			console.log('✅ 密码验证成功，创建session...');
			const sessionToken = auth.generateSessionToken();
			const session = await auth.createSession(sessionToken, existingUser.id);
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

			console.log('🎉 登录成功，重定向到首页');
			return redirect(302, '/');
		} catch (error) {
			// 检查是否是重定向，如果是则重新抛出
			if (isRedirect(error)) {
				console.log('🔄 重定向到:', error.location);
				throw error;
			}
			
			// 真正的错误才记录和返回500
			console.error('💥 登录过程中发生错误:', error);
			console.error('错误堆栈:', error instanceof Error ? error.stack : 'No stack trace');
			return fail(500, { 
				message: 'Internal server error. Please try again later.' 
			});
		}
	}
};

function validateUsername(username: unknown): username is string {
	return (
		typeof username === 'string' &&
		username.length >= 3 &&
		username.length <= 31 &&
		/^[a-z0-9_-]+$/.test(username)
	);
}

function validatePassword(password: unknown): password is string {
	return typeof password === 'string' && password.length >= 6 && password.length <= 255;
}
