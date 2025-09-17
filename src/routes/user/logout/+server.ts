import type { RequestHandler } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	console.log('🚪 开始登出处理...');
	
	if (locals.session) {
		console.log('🗑️ 删除session:', locals.session.id);
		await auth.invalidateSession(locals.session.id);
	}
	
	console.log('🍪 删除session cookie...');
	auth.deleteSessionTokenCookie({ cookies });
	
	console.log('✅ 登出完成');
	return new Response(null, { status: 204 });
};
