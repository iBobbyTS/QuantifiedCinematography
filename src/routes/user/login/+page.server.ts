import { fail, redirect, isRedirect } from '@sveltejs/kit';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import * as auth from '$lib/server/auth.js';
import { verifyPassword } from '$lib/password.js';

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
			
			const formData = await event.request.formData();
			const username = formData.get('username');
			const password = formData.get('password');


			if (!validateUsername(username)) {
				return fail(400, {
					message: 'Invalid username (min 3, max 31 characters, alphanumeric only)'
				});
			}
			if (!validatePassword(password)) {
				return fail(400, { message: 'Invalid password (min 6, max 255 characters)' });
			}

			const results = await db.select().from(user).where(eq(user.username, username));

			const existingUser = results.at(0);
			if (!existingUser) {
				return fail(400, { message: 'User not found' });
			}

			const validPassword = await verifyPassword(existingUser.passwordHash, password);
			
			if (!validPassword) {
				return fail(400, { message: 'Incorrect password' });
			}

			// 检查用户是否被禁用
			if (existingUser.disabled === 1) {
				return fail(403, { message: 'Account is disabled' });
			}

			const sessionToken = auth.generateSessionToken();
			const session = await auth.createSession(sessionToken, existingUser.id);
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);

			return redirect(302, '/');
		} catch (error) {
			// 检查是否是重定向，如果是则重新抛出
			if (isRedirect(error)) {
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
