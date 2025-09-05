import type { PageData as BasePageData } from './$types';

export interface PageData extends BasePageData {
	users: Array<{
		id: string;
		username: string;
		nickname: string;
		email: string;
		permission: number;
		createdAt: Date;
		updatedAt: Date;
	}>;
}
