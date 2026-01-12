import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/index.js';
import { productCameras, brands } from '$lib/server/db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '$lib/permission/bitmask.js';
import { eq, ilike, asc, gt, and, ne } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
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

    const cameraId = parseInt(params.id);
    if (isNaN(cameraId)) {
        throw error(404, { message: 'Camera not found' });
    }

    try {
        // Fetch camera with brand info
        const camera = await db
            .select({
                id: productCameras.id,
                name: productCameras.name,
                brandId: productCameras.brandId,
                brandName: brands.name,
                releaseYear: productCameras.releaseYear,
                cinema: productCameras.cinema,
                createdAt: productCameras.createdAt,
                updatedAt: productCameras.updatedAt
            })
            .from(productCameras)
            .leftJoin(brands, eq(productCameras.brandId, brands.id))
            .where(eq(productCameras.id, cameraId))
            .limit(1);

        if (camera.length === 0) {
            throw error(404, { message: 'Camera not found' });
        }

        // Fetch all brands for the form
        const allBrands = await db.select().from(brands).where(gt(brands.id, 0)).orderBy(asc(brands.name));

        return {
            camera: camera[0],
            brands: allBrands
        };
    } catch (err) {
        if (err && typeof err === 'object' && 'status' in err) {
            throw err;
        }
        console.error('Failed to load camera:', err);
        throw error(500, { message: 'Failed to load camera' });
    }
};

export const actions: Actions = {
    updateCamera: async ({ request, params, locals }) => {
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

        const cameraId = parseInt(params.id);
        if (isNaN(cameraId)) {
            return fail(404, { message: 'Camera not found' });
        }

        try {
            const formData = await request.formData();
            const brandId = parseInt(formData.get('brandId') as string);
            const name = formData.get('name') as string;
            const releaseYear = parseInt(formData.get('releaseYear') as string);
            const cinema = formData.get('cinema') === 'true';

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

            // Check if camera exists
            const existingCamera = await db
                .select()
                .from(productCameras)
                .where(eq(productCameras.id, cameraId))
                .limit(1);

            if (existingCamera.length === 0) {
                return fail(404, { message: 'Camera not found' });
            }

            // Check if name already exists (excluding current camera)
            const nameExists = await db
                .select()
                .from(productCameras)
                .where(and(ilike(productCameras.name, name.trim()), ne(productCameras.id, cameraId)))
                .limit(1);

            if (nameExists.length > 0) {
                return fail(400, { message: 'Camera name already exists' });
            }

            // Update
            await db
                .update(productCameras)
                .set({
                    brandId,
                    name: name.trim(),
                    releaseYear,
                    cinema,
                    updatedAt: new Date()
                })
                .where(eq(productCameras.id, cameraId));

            return { success: true };
        } catch (err) {
            console.error('Failed to update camera:', err);
            return fail(500, { message: 'Failed to update camera' });
        }
    }
};
