import type { RequestHandler } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	
	if (locals.session) {
		await auth.invalidateSession(locals.session.id);
	}
	
	auth.deleteSessionTokenCookie({ cookies } as any);
	
	return new Response(null, { status: 204 });
};
