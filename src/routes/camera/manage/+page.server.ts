import { error, redirect, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { productCameras, brands } from '$lib/server/db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '$lib/permission/bitmask.js';
import { and, or, like, eq, sql, desc, asc } from 'drizzle-orm';

// Natural sort comparison function for strings with numbers
// Example: "R5 Mark II" < "R50" (5 < 50 numerically)
function naturalCompare(a: string, b: string): number {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;

    // Split strings into parts (text and numbers)
    const aParts = a.match(/(\d+|\D+)/g) || [];
    const bParts = b.match(/(\d+|\D+)/g) || [];

    const minLength = Math.min(aParts.length, bParts.length);

    for (let i = 0; i < minLength; i++) {
        const aPart = aParts[i];
        const bPart = bParts[i];

        // Check if both parts are numbers
        const aNum = parseInt(aPart, 10);
        const bNum = parseInt(bPart, 10);

        if (!isNaN(aNum) && !isNaN(bNum)) {
            // Both are numbers, compare numerically
            if (aNum !== bNum) {
                return aNum - bNum;
            }
        } else {
            // At least one is text, compare as strings (case-insensitive)
            const aLower = aPart.toLowerCase();
            const bLower = bPart.toLowerCase();
            if (aLower !== bLower) {
                return aLower < bLower ? -1 : 1;
            }
        }
    }

    // If all compared parts are equal, shorter string comes first
    return aParts.length - bParts.length;
}

// Sort cameras using natural sort
function sortCameras(
    cameras: any[],
    sortConfig: { brand?: 'asc' | 'desc'; name?: 'asc' | 'desc'; year?: 'asc' | 'desc' }
): any[] {
    const sorted = [...cameras];

    sorted.sort((a, b) => {
        // Sort by brand (natural sort)
        if (sortConfig.brand) {
            const brandA = (a.brandName || '').trim();
            const brandB = (b.brandName || '').trim();
            const brandCompare = naturalCompare(brandA, brandB);
            if (brandCompare !== 0) {
                return sortConfig.brand === 'asc' ? brandCompare : -brandCompare;
            }
        } else {
            // Default: brand ASC
            const brandA = (a.brandName || '').trim();
            const brandB = (b.brandName || '').trim();
            const brandCompare = naturalCompare(brandA, brandB);
            if (brandCompare !== 0) {
                return brandCompare;
            }
        }

        // Sort by name (natural sort)
        if (sortConfig.name) {
            const nameA = (a.name || '').trim();
            const nameB = (b.name || '').trim();
            const nameCompare = naturalCompare(nameA, nameB);
            if (nameCompare !== 0) {
                return sortConfig.name === 'asc' ? nameCompare : -nameCompare;
            }
        } else {
            // Default: name ASC
            const nameA = (a.name || '').trim();
            const nameB = (b.name || '').trim();
            const nameCompare = naturalCompare(nameA, nameB);
            if (nameCompare !== 0) {
                return nameCompare;
            }
        }

        // Sort by year
        if (sortConfig.year) {
            const yearA = a.releaseYear || 0;
            const yearB = b.releaseYear || 0;
            if (yearA !== yearB) {
                return sortConfig.year === 'asc' ? yearA - yearB : yearB - yearA;
            }
        } else {
            // Default: year DESC
            const yearA = a.releaseYear || 0;
            const yearB = b.releaseYear || 0;
            if (yearA !== yearB) {
                return yearB - yearA; // DESC
            }
        }

        return 0;
    });

    return sorted;
}

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
        // Fetch all cameras with brand info (no database sorting, will sort in JS)
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
            .leftJoin(brands, eq(productCameras.brandId, brands.id));

        // Sort using natural sort: brand ASC, name ASC, year DESC
        const sortedCameras = sortCameras(allCameras, {
            brand: 'asc',
            name: 'asc',
            year: 'desc'
        });

        return {
            cameras: sortedCameras
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

            // Fetch filtered data (no database sorting, will sort in JS)
            // Note: We need to fetch all matching records to sort properly, then paginate
            const allFilteredCameras = await db
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
                .where(whereClause);

            // Sort using natural sort
            const sortConfig = sort && typeof sort === 'object' ? sort : {
                brand: 'asc' as const,
                name: 'asc' as const,
                year: 'desc' as const
            };
            const sortedCameras = sortCameras(allFilteredCameras, sortConfig);

            // Apply pagination after sorting
            const filteredCameras = sortedCameras.slice(offset, offset + limit);

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
