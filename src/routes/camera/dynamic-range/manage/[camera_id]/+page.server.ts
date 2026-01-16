import { error, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { productCameras, brands, cameraDynamicRangeData } from '$lib/server/db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '$lib/permission/bitmask.js';
import { eq, and } from 'drizzle-orm';

export const load: ServerLoad = async ({ locals, params }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, { message: 'Unauthorized' });
	}

	// Check camera permission
	if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.CAMERA)) {
		throw error(403, { message: 'Forbidden: Camera permission required' });
	}

	const cameraId = parseInt(params.camera_id || '');
	if (isNaN(cameraId)) {
		throw error(404, { message: 'Invalid camera ID' });
	}

	// Fetch camera info
	const camera = await db
		.select({
			id: productCameras.id,
			name: productCameras.name,
			brandName: brands.name,
			brandId: productCameras.brandId
		})
		.from(productCameras)
		.leftJoin(brands, eq(productCameras.brandId, brands.id))
		.where(eq(productCameras.id, cameraId))
		.limit(1);

	if (camera.length === 0) {
		throw error(404, { message: 'Camera not found' });
	}

	// Fetch all dynamic range data for this camera and user
	const records = await db
		.select()
		.from(cameraDynamicRangeData)
		.where(
			and(
				eq(cameraDynamicRangeData.cameraId, cameraId),
				eq(cameraDynamicRangeData.userId, locals.user.id)
			)
		)
		.orderBy(cameraDynamicRangeData.createdAt);

	return {
		camera: camera[0],
		records: records
	};
};

export const actions: Actions = {
	updateRecords: async ({ request, locals, params }) => {
		// Check authentication
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		// Check camera permission
		if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.CAMERA)) {
			return fail(403, { message: 'Forbidden: Camera permission required' });
		}

		const cameraId = parseInt(params.camera_id || '');
		if (isNaN(cameraId)) {
			return fail(400, { message: 'Invalid camera ID' });
		}

		try {
			const formData = await request.formData();
			const recordsJson = formData.get('records') as string;
			const records = JSON.parse(recordsJson);

			// Validate records structure
			if (!Array.isArray(records)) {
				return fail(400, { message: 'Invalid records format' });
			}

			// Update each record
			for (const record of records) {
				const recordId = parseInt(record.id);
				if (isNaN(recordId)) {
					continue;
				}

				// Verify the record belongs to this camera and user
				const existing = await db
					.select()
					.from(cameraDynamicRangeData)
					.where(
						and(
							eq(cameraDynamicRangeData.id, recordId),
							eq(cameraDynamicRangeData.cameraId, cameraId),
							eq(cameraDynamicRangeData.userId, locals.user.id)
						)
					)
					.limit(1);

				if (existing.length === 0) {
					continue; // Skip records that don't belong to this user
				}

				// Build update object
				const updateData: any = {
					updatedAt: new Date()
				};

				// Map fields from record to database columns
				if (record.ei !== undefined && record.ei !== '') {
					updateData.ei = parseInt(record.ei) || null;
				} else {
					updateData.ei = null;
				}

				if (record.iso !== undefined && record.iso !== '') {
					updateData.iso = parseInt(record.iso) || null;
				} else {
					updateData.iso = null;
				}

				if (record.specialMode !== undefined) {
					updateData.specialMode = record.specialMode.trim() || null;
				}

				if (record.codec !== undefined) {
					updateData.codec = record.codec.trim() || null;
				}

				if (record.log !== undefined) {
					updateData.log = record.log.trim() || null;
				}

				if (record.bitDepth !== undefined && record.bitDepth !== '') {
					updateData.bitDepth = parseInt(record.bitDepth) || null;
				} else {
					updateData.bitDepth = null;
				}

				if (record.chromaSubsampling !== undefined) {
					updateData.chromaSubsampling = record.chromaSubsampling.trim() || null;
				}

				if (record.bitrate !== undefined) {
					updateData.bitrate = record.bitrate.trim() || null;
				}

				if (record.resolution !== undefined) {
					updateData.resolution = record.resolution.trim() || null;
				}

				if (record.framerate !== undefined) {
					updateData.framerate = record.framerate.trim() || null;
				}

				if (record.crop !== undefined) {
					updateData.crop = record.crop.trim() || null;
				}

				if (record.slopeBased !== undefined && record.slopeBased !== '') {
					updateData.slopeBased = parseFloat(record.slopeBased) || null;
				} else {
					updateData.slopeBased = null;
				}

				if (record.snr1 !== undefined && record.snr1 !== '') {
					updateData.snr1 = parseFloat(record.snr1) || null;
				} else {
					updateData.snr1 = null;
				}

				if (record.snr2 !== undefined && record.snr2 !== '') {
					updateData.snr2 = parseFloat(record.snr2) || null;
				} else {
					updateData.snr2 = null;
				}

				if (record.snr4 !== undefined && record.snr4 !== '') {
					updateData.snr4 = parseFloat(record.snr4) || null;
				} else {
					updateData.snr4 = null;
				}

				if (record.snr10 !== undefined && record.snr10 !== '') {
					updateData.snr10 = parseFloat(record.snr10) || null;
				} else {
					updateData.snr10 = null;
				}

				if (record.snr40 !== undefined && record.snr40 !== '') {
					updateData.snr40 = parseFloat(record.snr40) || null;
				} else {
					updateData.snr40 = null;
				}

				// Update the record
				await db
					.update(cameraDynamicRangeData)
					.set(updateData)
					.where(eq(cameraDynamicRangeData.id, recordId));
			}

			return { success: true, message: 'Records updated successfully' };
		} catch (err) {
			console.error('Update records error:', err);
			return fail(500, { message: 'Failed to update records' });
		}
	},

	deleteRecord: async ({ request, locals, params }) => {
		// Check authentication
		if (!locals.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		// Check camera permission
		if (!UserPermissions.hasPermission(locals.user.permission, USER_PERMISSIONS.CAMERA)) {
			return fail(403, { message: 'Forbidden: Camera permission required' });
		}

		const cameraId = parseInt(params.camera_id || '');
		if (isNaN(cameraId)) {
			return fail(400, { message: 'Invalid camera ID' });
		}

		try {
			const formData = await request.formData();
			const recordId = formData.get('recordId') as string;

			if (!recordId) {
				return fail(400, { message: 'Record ID is required' });
			}

			const recordIdNum = parseInt(recordId);
			if (isNaN(recordIdNum)) {
				return fail(400, { message: 'Invalid record ID' });
			}

			// Verify the record belongs to this camera and user
			const existingRecord = await db
				.select()
				.from(cameraDynamicRangeData)
				.where(
					and(
						eq(cameraDynamicRangeData.id, recordIdNum),
						eq(cameraDynamicRangeData.cameraId, cameraId),
						eq(cameraDynamicRangeData.userId, locals.user.id)
					)
				)
				.limit(1);

			if (existingRecord.length === 0) {
				return fail(404, { message: 'Record not found' });
			}

			// Delete the record
			await db.delete(cameraDynamicRangeData).where(eq(cameraDynamicRangeData.id, recordIdNum));

			return { success: true, message: 'Record deleted successfully' };
		} catch (err) {
			console.error('Delete record error:', err);
			return fail(500, { message: 'Failed to delete record' });
		}
	}
};
