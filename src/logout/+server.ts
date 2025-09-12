import type { RequestHandler } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (locals.session) {
		await lucia.invalidateSession(locals.session.id);
	}
	// clear cookie
	const blank = lucia.createBlankSessionCookie();
	cookies.set(blank.name, blank.value, { path: '.', ...blank.attributes });
	return new Response(null, { status: 204 });
};
