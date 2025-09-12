import type { RequestEvent } from '@sveltejs/kit';

export interface RequestBody {
	userId: string;
	permissions: number;
}

export interface ResponseBody {
	success: boolean;
	message: string;
}
