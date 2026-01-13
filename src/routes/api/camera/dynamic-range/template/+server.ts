import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { productCameras, brands } from '$lib/server/db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '$lib/permission/bitmask.js';
import { inArray, eq } from 'drizzle-orm';

// CSV header translations
const CSV_HEADERS = {
    'en': {
        'Camera ID': 'Camera ID',
        'Brand': 'Brand',
        'Camera Name': 'Camera Name',
        'EI': 'EI',
        'ISO': 'ISO',
        'Codec': 'Codec',
        'Log Type': 'Log Type',
        'Bit Depth': 'Bit Depth',
        'Chroma Subsampling': 'Chroma Subsampling',
        'Bitrate': 'Bitrate (Mbps)',
        'Resolution': 'Resolution',
        'Framerate': 'Framerate',
        'Crop': 'Crop',
        'Slope-based': 'Slope-based',
        'SNR=1': 'SNR=1',
        'SNR=2': 'SNR=2',
        'SNR=4': 'SNR=4',
        'SNR=10': 'SNR=10',
        'SNR=40': 'SNR=40'
    },
    'zh-cn': {
        'Camera ID': 'Camera ID',
        'Brand': '品牌',
        'Camera Name': '相机型号',
        'EI': 'EI',
        'ISO': 'ISO',
        'Codec': '编码',
        'Log Type': 'Log类型',
        'Bit Depth': '位深',
        'Chroma Subsampling': '色度采样',
        'Bitrate': '码率(Mbps)',
        'Resolution': '分辨率',
        'Framerate': '帧率',
        'Crop': '裁切(画幅)',
        'Slope-based': 'Slope-based',
        'SNR=1': 'SNR=1',
        'SNR=2': 'SNR=2',
        'SNR=4': 'SNR=4',
        'SNR=10': 'SNR=10',
        'SNR=40': 'SNR=40'
    }
};

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
        const locale = form.get('locale') as string || 'en'; // Get locale from form data, default to 'en'

        if (!cameraIdsStr || !selectedFieldsStr) {
            throw error(400, { message: 'Missing cameraIds or selectedFields' });
        }

        const cameraIds: number[] = JSON.parse(cameraIdsStr);
        const selectedFields: string[] = JSON.parse(selectedFieldsStr);

        // Get locale (default to 'en' if invalid)
        const currentLocale = (locale === 'zh-cn' ? 'zh-cn' : 'en') as 'en' | 'zh-cn';
        const headerMap = CSV_HEADERS[currentLocale];

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

        // Generate CSV with localized headers
        const baseHeaders = [
            headerMap['Camera ID'],
            headerMap['Brand'],
            headerMap['Camera Name']
        ];
        const fieldHeaders = selectedFields.map(field => headerMap[field] || field);
        const headers = [...baseHeaders, ...fieldHeaders];
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
