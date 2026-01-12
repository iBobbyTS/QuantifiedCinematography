import { error, redirect, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { productCameras, brands } from '$lib/server/db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '$lib/permission/bitmask.js';
import { and, or, like, eq, sql, desc, asc } from 'drizzle-orm';

export const load: ServerLoad = async ({ locals }) => {
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

    try {
        // Fetch all cameras with brand info
        // Default sorting: brand ASC, name ASC, year DESC
        const allCameras = await db.select({
            id: productCameras.id,
            name: productCameras.name,
            brandId: productCameras.brandId,
            brandName: brands.name,
            releaseYear: productCameras.releaseYear,
            createdAt: productCameras.createdAt,
            updatedAt: productCameras.updatedAt
        })
            .from(productCameras)
            .leftJoin(brands, eq(productCameras.brandId, brands.id))
            .orderBy(brands.name, productCameras.name, desc(productCameras.releaseYear));

        return {
            cameras: allCameras
        };
    } catch (err) {
        console.error('Failed to load cameras:', err);
        throw error(500, { message: 'Failed to load cameras' });
    }
};

export const actions: Actions = {
    filter: async ({ request, locals }) => {
        // Check login
        if (!locals.user) {
            return fail(401, { message: 'Unauthorized' });
        }

        // Check permission
        const hasCameraPermission = UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.CAMERA);
        const hasAdminPermission = UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.ADMINISTRATOR);

        if (!hasCameraPermission && !hasAdminPermission) {
            return fail(403, { message: 'Insufficient permissions' });
        }

        try {
            // Parse payload
            let payload: any = null;
            const contentType = request.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                payload = await request.json();
            } else {
                const form = await request.formData();
                const raw = form.get('payload');
                if (typeof raw === 'string') {
                    try { payload = JSON.parse(raw); } catch { }
                }
            }

            const { search, sort, pagination } = payload || {};

            // Build conditions
            const conditions: any[] = [];

            // Fuzzy search: brand name or camera name
            if (search && typeof search === 'string' && search.trim()) {
                const searchTerm = `%${search.trim()}%`;
                conditions.push(
                    or(
                        like(productCameras.name, searchTerm),
                        like(brands.name, searchTerm)
                    )
                );
            }

            // Pagination
            const page = pagination?.page || 1;
            const limit = pagination?.limit || 10;
            const offset = (page - 1) * limit;

            const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

            // Build orderBy clause - default: brand ASC, name ASC, year DESC
            let orderByClause: any[] = [];
            if (sort && typeof sort === 'object') {
                // Multi-field sorting: brand, name, year
                if (sort.brand) {
                    orderByClause.push(sort.brand === 'asc' ? brands.name : desc(brands.name));
                }
                if (sort.name) {
                    orderByClause.push(sort.name === 'asc' ? productCameras.name : desc(productCameras.name));
                }
                if (sort.year) {
                    orderByClause.push(sort.year === 'asc' ? productCameras.releaseYear : desc(productCameras.releaseYear));
                }
            }
            
            // Default sorting if no sort config provided
            if (orderByClause.length === 0) {
                orderByClause = [
                    brands.name, // brand ASC
                    productCameras.name, // name ASC
                    desc(productCameras.releaseYear) // year DESC
                ];
            }

            // Fetch filtered data
            const filteredCameras = await db
                .select({
                    id: productCameras.id,
                    name: productCameras.name,
                    brandId: productCameras.brandId,
                    brandName: brands.name,
                    releaseYear: productCameras.releaseYear,
                    createdAt: productCameras.createdAt,
                    updatedAt: productCameras.updatedAt
                })
                .from(productCameras)
                .leftJoin(brands, eq(productCameras.brandId, brands.id))
                .where(whereClause)
                .orderBy(...orderByClause)
                .limit(limit)
                .offset(offset);

            // Count total
            const totalCountRows = await db
                .select({ count: sql<number>`count(*)` })
                .from(productCameras)
                .leftJoin(brands, eq(productCameras.brandId, brands.id))
                .where(whereClause);
            const total = totalCountRows?.[0]?.count ?? 0;

            return {
                success: true,
                cameras: filteredCameras,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (err) {
            console.error('Filter action error:', err);
            return fail(500, { message: 'Failed to filter cameras' });
        }
    },

    deleteCamera: async ({ request, locals }) => {
        // Check login
        if (!locals.user) {
            return fail(401, { message: 'Unauthorized' });
        }

        // Check permission
        const hasCameraPermission = UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.CAMERA);
        const hasAdminPermission = UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.ADMINISTRATOR);

        if (!hasCameraPermission && !hasAdminPermission) {
            return fail(403, { message: 'Insufficient permissions' });
        }

        try {
            const form = await request.formData();
            const cameraId = parseInt(String(form.get('cameraId') || '0'));

            if (!cameraId) {
                return fail(400, { message: 'Camera ID is required' });
            }

            // Check existence
            const existing = await db.select().from(productCameras).where(eq(productCameras.id, cameraId)).limit(1);
            if (existing.length === 0) {
                return fail(404, { message: 'Camera not found' });
            }

            // Delete
            await db.delete(productCameras).where(eq(productCameras.id, cameraId));

            return { success: true, cameraId };
        } catch (err) {
            console.error('Error deleting camera:', err);
            return fail(500, { message: 'Failed to delete camera' });
        }
    }
};
