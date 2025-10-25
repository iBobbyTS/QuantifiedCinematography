export interface PageData {
	users: Array<{
		id: string;
		username: string;
		nickname: string;
		email: string;
		permission: number;
		disabled: number;
		createdAt: Date;
		updatedAt: Date;
	}>;
}
