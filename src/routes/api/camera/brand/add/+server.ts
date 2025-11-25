import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { brands } from '$lib/server/db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '$lib/permission/bitmask.js';
import { eq, ilike } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
    // Check login
    if (!locals.user) {
        return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Check permission (CAMERA or ADMINISTRATOR)
    const hasCameraPermission = UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.CAMERA);
    const hasAdminPermission = UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.ADMINISTRATOR);

    if (!hasCameraPermission && !hasAdminPermission) {
        return json({ success: false, message: 'Access denied' }, { status: 403 });
    }

    try {
        const { name } = await request.json();

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return json({ success: false, message: 'Invalid brand name' }, { status: 400 });
        }

        const trimmedName = name.trim();

        // Check if brand already exists
        const existingBrand = await db
            .select()
            .from(brands)
            .where(ilike(brands.name, trimmedName))
            .limit(1);

        if (existingBrand.length > 0) {
            return json({
                success: true,
                brand: { id: existingBrand[0].id, name: existingBrand[0].name },
                message: 'Brand already exists'
            });
        }

        // Insert new brand
        const [newBrand] = await db.insert(brands)
            .values({ name: trimmedName })
            .returning({ id: brands.id, name: brands.name });

        return json({ success: true, brand: newBrand });
    } catch (err) {
        console.error('Error adding brand:', err);
        return json({ success: false, message: 'Failed to add brand' }, { status: 500 });
    }
};
