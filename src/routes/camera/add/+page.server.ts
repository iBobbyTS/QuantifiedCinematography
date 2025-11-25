import { error, redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { productCameras } from '$lib/server/db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '$lib/permission/bitmask.js';
import { eq, ilike } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
    // Check login
    if (!locals.user) {
        throw redirect(302, '/user/login');
    }

    // Check permission (CAMERA or ADMINISTRATOR)
    const hasCameraPermission = UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.CAMERA);
    const hasAdminPermission = UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.ADMINISTRATOR);

    if (!hasCameraPermission && !hasAdminPermission) {
        throw error(403, { message: 'Access denied. Camera permission required.' });
    }

    return {};
};

export const actions: Actions = {
    createCamera: async ({ request, locals }) => {
        // Check login
        if (!locals.user) {
            return fail(401, { message: 'Unauthorized' });
        }

        // Check permission
        const hasCameraPermission = UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.CAMERA);
        const hasAdminPermission = UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.ADMINISTRATOR);

        if (!hasCameraPermission && !hasAdminPermission) {
            return fail(403, { message: 'Access denied. Camera permission required.' });
        }

        try {
            const formData = await request.formData();
            const brandId = parseInt(formData.get('brandId') as string);
            const name = formData.get('name') as string;
            const releaseYear = parseInt(formData.get('releaseYear') as string);

            // Validate input
            if (!brandId || isNaN(brandId)) {
                return fail(400, { message: 'Invalid brand' });
            }

            if (!name || name.trim().length === 0) {
                return fail(400, { message: 'Camera name is required' });
            }

            const currentYear = new Date().getFullYear();
            if (!releaseYear || isNaN(releaseYear) || releaseYear <= 1900 || releaseYear >= currentYear + 2) {
                return fail(400, { message: 'Invalid release year' });
            }

            // Check if name already exists (double check server side)
            const existing = await db
                .select()
                .from(productCameras)
                .where(ilike(productCameras.name, name.trim()))
                .limit(1);

            if (existing.length > 0) {
                return fail(400, { message: 'Camera name already exists' });
            }

            // Insert
            await db.insert(productCameras).values({
                brandId,
                name: name.trim(),
                releaseYear
            });

            return { success: true };
        } catch (err) {
            console.error('Failed to create camera:', err);
            return fail(500, { message: 'Failed to create camera' });
        }
    }
};
