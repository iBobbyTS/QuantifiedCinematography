import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { productCameras, brands } from '$lib/server/db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '$lib/permission/bitmask.js';
import { inArray, eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
    // Check login
    if (!locals.user) {
        throw error(401, { message: 'Unauthorized' });
    }

    // Check permission
    const hasCameraPermission = UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.CAMERA);
    const hasAdminPermission = UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.ADMINISTRATOR);

    if (!hasCameraPermission && !hasAdminPermission) {
        throw error(403, { message: 'Insufficient permissions' });
    }

    try {
        const form = await request.formData();
        const cameraIdsStr = form.get('cameraIds') as string;
        const selectedFieldsStr = form.get('selectedFields') as string;

        if (!cameraIdsStr || !selectedFieldsStr) {
            throw error(400, { message: 'Missing cameraIds or selectedFields' });
        }

        const cameraIds: number[] = JSON.parse(cameraIdsStr);
        const selectedFields: string[] = JSON.parse(selectedFieldsStr);

        // Fetch selected cameras
        const cameras = await db
            .select({
                id: productCameras.id,
                name: productCameras.name,
                brandName: brands.name
            })
            .from(productCameras)
            .leftJoin(brands, eq(productCameras.brandId, brands.id))
            .where(inArray(productCameras.id, cameraIds));

        // Generate CSV
        const headers = ['Camera ID', 'Brand', 'Camera Name', ...selectedFields];
        const rows = cameras.map(camera => {
            const row: (string | number)[] = [camera.id, camera.brandName || '', camera.name];
            selectedFields.forEach(field => {
                row.push(''); // Empty cells for user to fill
            });
            return row;
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Return CSV file
        return new Response(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="dynamic_range_template_${Date.now()}.csv"`
            }
        });
    } catch (err) {
        console.error('Download template error:', err);
        if (err && typeof err === 'object' && 'status' in err) {
            throw err;
        }
        throw error(500, { message: 'Failed to generate template' });
    }
};
