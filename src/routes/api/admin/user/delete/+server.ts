import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db/config.js';
import { users } from '$lib/db/schema.js';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ request, locals }) => {
	// Check if user is authenticated
	if (!locals.user) {
		throw error(401, { message: 'Unauthorized' });
	}

	// Check if user has administrator permission
	if (!locals.user.permission || (locals.user.permission & 8) === 0) {
		throw error(403, { message: 'Insufficient permissions' });
	}

	try {
		const { userId } = await request.json();

		if (!userId) {
			throw error(400, { message: 'User ID is required' });
		}

		// Check if trying to delete own account
		if (userId === locals.user.id) {
			throw error(400, { message: 'Cannot delete your own account' });
		}

		// Check if user exists
		const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		
		if (existingUser.length === 0) {
			throw error(404, { message: 'User not found' });
		}

		// Delete the user
		await db.delete(users).where(eq(users.id, userId));

		return json({
			message: 'User deleted successfully',
			userId: userId
		});

	} catch (err: any) {
		console.error('Error deleting user:', err);
		
		if (err.status) {
			throw err;
		}
		
		throw error(500, { message: 'Failed to delete user' });
	}
};
