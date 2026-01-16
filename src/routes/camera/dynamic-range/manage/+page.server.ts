import { error, redirect, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { productCameras, brands, cameraDynamicRangeData } from '$lib/server/db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '$lib/permission/bitmask.js';
import { and, or, like, eq, sql, inArray } from 'drizzle-orm';

// Helper function to get record counts for cameras
async function getRecordCounts(cameraIds: number[], userId: string): Promise<Map<number, number>> {
    if (cameraIds.length === 0) {
        return new Map();
    }

    try {
        const counts = await db
            .select({
                cameraId: cameraDynamicRangeData.cameraId,
                count: sql<number>`count(*)`
            })
            .from(cameraDynamicRangeData)
            .where(
                and(
                    inArray(cameraDynamicRangeData.cameraId, cameraIds),
                    eq(cameraDynamicRangeData.userId, userId)
                )
            )
            .groupBy(cameraDynamicRangeData.cameraId);

        const countMap = new Map<number, number>();
        counts.forEach(({ cameraId, count }) => {
            countMap.set(cameraId, count);
        });

        // Set 0 for cameras without records
        cameraIds.forEach(id => {
            if (!countMap.has(id)) {
                countMap.set(id, 0);
            }
        });

        return countMap;
    } catch (err: any) {
        // If table doesn't exist, return all zeros
        if (err?.code === '42P01' || err?.message?.includes('does not exist')) {
            console.warn('camera_dynamic_range_data table does not exist yet, returning zero counts');
            const countMap = new Map<number, number>();
            cameraIds.forEach(id => {
                countMap.set(id, 0);
            });
            return countMap;
        }
        throw err;
    }
}

// Natural sort comparison function for strings with numbers
function naturalCompare(a: string, b: string): number {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;

    const aParts = a.match(/(\d+|\D+)/g) || [];
    const bParts = b.match(/(\d+|\D+)/g) || [];

    const minLength = Math.min(aParts.length, bParts.length);

    for (let i = 0; i < minLength; i++) {
        const aPart = aParts[i];
        const bPart = bParts[i];

        const aNum = parseInt(aPart, 10);
        const bNum = parseInt(bPart, 10);

        if (!isNaN(aNum) && !isNaN(bNum)) {
            if (aNum !== bNum) {
                return aNum - bNum;
            }
        } else {
            const aLower = aPart.toLowerCase();
            const bLower = bPart.toLowerCase();
            if (aLower !== bLower) {
                return aLower < bLower ? -1 : 1;
            }
        }
    }

    return aParts.length - bParts.length;
}

// Sort cameras using natural sort
function sortCameras(
    cameras: any[],
    sortConfig: { brand: 'asc' | 'desc'; name?: 'asc' | 'desc'; year?: 'asc' | 'desc' }
): any[] {
    const sorted = [...cameras];

    sorted.sort((a, b) => {
        // Sort by brand (natural sort) - always exists, highest priority
        const brandA = (a.brandName || '').trim();
        const brandB = (b.brandName || '').trim();
        const brandCompare = naturalCompare(brandA, brandB);
        if (brandCompare !== 0) {
            return sortConfig.brand === 'asc' ? brandCompare : -brandCompare;
        }

        // Sort by name or year (mutually exclusive)
        if (sortConfig.name) {
            const nameA = (a.name || '').trim();
            const nameB = (b.name || '').trim();
            const nameCompare = naturalCompare(nameA, nameB);
            if (nameCompare !== 0) {
                return sortConfig.name === 'asc' ? nameCompare : -nameCompare;
            }
        } else if (sortConfig.year) {
            const yearA = a.releaseYear || 0;
            const yearB = b.releaseYear || 0;
            if (yearA !== yearB) {
                return sortConfig.year === 'asc' ? yearA - yearB : yearB - yearA;
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
        // Don't load camera data in load function, let frontend request it based on localStorage
        // Return empty array, frontend will request data with proper pagination
        return {
            cameras: []
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
            const allFilteredCameras = await db
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

            // Get record counts for filtered cameras
            const cameraIds = filteredCameras.map(c => c.id);
            const recordCounts = await getRecordCounts(cameraIds, locals.user!.id);

            // Add record count to each camera
            const camerasWithCounts = filteredCameras.map(camera => ({
                ...camera,
                recordCount: recordCounts.get(camera.id) || 0
            }));

            // Count total
            const totalCountRows = await db
                .select({ count: sql<number>`count(*)` })
                .from(productCameras)
                .leftJoin(brands, eq(productCameras.brandId, brands.id))
                .where(whereClause);
            const total = totalCountRows?.[0]?.count ?? 0;

            return {
                success: true,
                cameras: camerasWithCounts,
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


    uploadData: async ({ request, locals }) => {
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
            const file = form.get('file') as File;

            if (!file) {
                return fail(400, { message: 'No file uploaded' });
            }

            // Parse CSV (simple parser that handles quoted fields)
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length < 2) {
                return fail(400, { message: 'CSV file must have at least a header row and one data row' });
            }

            // Simple CSV parser that handles quoted fields
            function parseCSVLine(line: string): string[] {
                const result: string[] = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            }

            const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
            const cameraIdIndex = headers.indexOf('Camera ID');
            if (cameraIdIndex === -1) {
                return fail(400, { message: 'CSV must contain "Camera ID" column' });
            }

            const dataRows = lines.slice(1);
            const records: any[] = [];

            for (const row of dataRows) {
                if (!row.trim()) continue; // Skip empty rows
                const values = parseCSVLine(row).map(v => v.replace(/^"|"$/g, ''));
                const cameraId = parseInt(values[cameraIdIndex]);
                if (isNaN(cameraId)) continue;

                const record: any = {
                    cameraId,
                    userId: locals.user!.id
                };

                // Map CSV columns to database fields
                const fieldMap: Record<string, string> = {
                    'EI': 'ei',
                    'ISO': 'iso',
                    'Special Mode': 'specialMode',
                    'Codec': 'codec',
                    'Log Type': 'log',
                    'Bit Depth': 'bitDepth',
                    'Chroma Subsampling': 'chromaSubsampling',
                    'Bitrate': 'bitrate',
                    'Resolution': 'resolution',
                    'Framerate': 'framerate',
                    'Crop': 'crop',
                    'Slope-based': 'slopeBased',
                    'SNR=1': 'snr1',
                    'SNR=2': 'snr2',
                    'SNR=4': 'snr4',
                    'SNR=10': 'snr10',
                    'SNR=40': 'snr40'
                };

                // Map localized headers to English field names
                const localizedFieldMap: Record<string, string> = {
                    // Chinese headers
                    '特殊模式': 'Special Mode',
                    '编码': 'Codec',
                    'Log类型': 'Log Type',
                    '位深': 'Bit Depth',
                    '色度采样': 'Chroma Subsampling',
                    '码率(Mbps)': 'Bitrate',
                    '分辨率': 'Resolution',
                    '帧率': 'Framerate',
                    '裁切(画幅)': 'Crop',
                    // English headers (keep as is)
                    'Special Mode': 'Special Mode',
                    'Codec': 'Codec',
                    'Log Type': 'Log Type',
                    'Bit Depth': 'Bit Depth',
                    'Chroma Subsampling': 'Chroma Subsampling',
                    'Bitrate (Mbps)': 'Bitrate',
                    'Resolution': 'Resolution',
                    'Framerate': 'Framerate',
                    'Crop': 'Crop'
                };

                headers.forEach((header, index) => {
                    if (header === 'Camera ID' || header === 'Brand' || header === 'Camera Name' || 
                        header === '品牌' || header === '相机型号') {
                        return; // Skip these columns
                    }

                    // Convert localized header to English field name if needed
                    const englishHeader = localizedFieldMap[header] || header;
                    const dbField = fieldMap[englishHeader];
                    if (dbField && values[index]) {
                        const value = values[index].trim();
                        if (value) {
                            if (dbField === 'ei' || dbField === 'iso' || dbField === 'bitDepth') {
                                record[dbField] = parseInt(value) || null;
                            } else if (dbField === 'slopeBased' || dbField.startsWith('snr')) {
                                record[dbField] = parseFloat(value) || null;
                            } else {
                                record[dbField] = value;
                            }
                        }
                    }
                });

                records.push(record);
            }

            // Insert records into database
            if (records.length > 0) {
                await db.insert(cameraDynamicRangeData).values(records);
            }

            return {
                success: true,
                message: `Successfully uploaded ${records.length} records`
            };
        } catch (err) {
            console.error('Upload data error:', err);
            return fail(500, { message: 'Failed to upload data' });
        }
    }
};
