/*
 * 服务端钩子文件
 * 处理服务端请求的中间件
 * 包括多语言中间件和用户认证中间件
 * 在请求处理前执行，用于设置用户会话和语言环境
 */
import { sequence } from '@sveltejs/kit/hooks';
import * as auth from '$lib/server/auth';
import type { Handle, HandleError } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%lang%', locale)
		});
	});

const handleAuth: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(auth.sessionCookieName);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await auth.validateSessionToken(sessionToken);

	if (session) {
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
	} else {
		auth.deleteSessionTokenCookie(event);
	}

	event.locals.user = user;
	event.locals.session = session;
	return resolve(event);
};

export const handle: Handle = sequence(handleParaglide, handleAuth);

export const handleError: HandleError = ({ error, event }) => {
	console.error('💥 未处理的服务器错误:', {
		message: error instanceof Error ? error.message : 'Unknown error',
		stack: error instanceof Error ? error.stack : 'No stack trace',
		url: event.url.toString(),
		method: event.request.method,
		timestamp: new Date().toISOString()
	});
	
	return {
		message: 'Internal server error',
		code: 'INTERNAL_ERROR'
	};
};
