/*
 * 服务端钩子文件
 * 处理服务端请求的中间件
 * 包括多语言中间件和用户认证中间件
 * 在请求处理前执行，用于设置用户会话和语言环境
 */
import { sequence } from '@sveltejs/kit/hooks';
import * as auth from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';

const databaseNotInitializedError = {
	message: 'Website database not initialized',
	code: 'DATABASE_NOT_INITIALIZED'
};

function getErrorMessage(err: unknown): string {
	if (!err) return '';
	if (err instanceof Error) return err.message;
	if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
		return err.message;
	}
	return String(err);
}

function isDatabaseNotInitializedError(err: unknown): boolean {
	if (!err) return false;

	if (typeof err === 'object' && err !== null) {
		if ('code' in err && err.code === 'DATABASE_NOT_INITIALIZED') return true;
		if ('body' in err && err.body && typeof err.body === 'object') {
			if ('code' in err.body && err.body.code === 'DATABASE_NOT_INITIALIZED') return true;
			if ('message' in err.body && typeof err.body.message === 'string') {
				const bodyMessage = err.body.message.toLowerCase();
				if (bodyMessage.includes('relation') && bodyMessage.includes('does not exist')) return true;
			}
		}
		if ('cause' in err && err.cause) {
			if (isDatabaseNotInitializedError(err.cause)) return true;
		}
	}

	const message = getErrorMessage(err).toLowerCase();
	return message.includes('relation') && message.includes('does not exist');
}

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%lang%', locale)
		});
	});

// Wrapper to catch database errors during resolve
async function resolveWithDatabaseErrorHandling(event: any, resolve: any) {
	try {
		return await resolve(event);
	} catch (err) {
		if (isDatabaseNotInitializedError(err)) {
			throw error(503, databaseNotInitializedError);
		}
		throw err;
	}
}

const handleAuth: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(auth.sessionCookieName);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
		return resolveWithDatabaseErrorHandling(event, resolve);
	}

	try {
		const { session, user } = await auth.validateSessionToken(sessionToken);

		if (session) {
			auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
		} else {
			auth.deleteSessionTokenCookie(event);
		}

		event.locals.user = user;
		event.locals.session = session;
		return resolveWithDatabaseErrorHandling(event, resolve);
	} catch (err) {
		// Check if it's a database table not found error
		if (isDatabaseNotInitializedError(err)) {
			throw error(503, databaseNotInitializedError);
		}
		// Re-throw other errors
		throw err;
	}
};

export const handle: Handle = sequence(handleParaglide, handleAuth);

export const handleError = ({ error: err, event, status }: { error: unknown; event: any; status?: number }) => {
	// Check if it's a database not initialized error
	// First check the error message directly
	const isDatabaseError = isDatabaseNotInitializedError(err) ||
		(status === 503 && err && typeof err === 'object' && 'code' in err && err.code === 'DATABASE_NOT_INITIALIZED');

	if (isDatabaseError) {
		// Don't log database initialization errors as unhandled errors
		return {
			...databaseNotInitializedError,
			status: 503
		};
	}

	console.error('💥 未处理的服务器错误:', {
		message: err instanceof Error ? err.message : 'Unknown error',
		stack: err instanceof Error ? err.stack : 'No stack trace',
		url: event.url.toString(),
		method: event.request.method,
		timestamp: new Date().toISOString()
	});
	
	return {
		message: 'Internal server error',
		code: 'INTERNAL_ERROR',
		status: status || 500
	};
};
