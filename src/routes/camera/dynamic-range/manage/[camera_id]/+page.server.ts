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

			// Process each record (insert new, update existing, or delete)
			for (const record of records) {
				const isNew = record.isNew === true;
				const isDeleted = record.isDeleted === true;
				const recordId = parseInt(record.id);

				// Handle deletion
				if (isDeleted) {
					if (isNaN(recordId) || recordId <= 0) {
						continue; // Skip invalid IDs
					}

					// Verify the record belongs to this camera and user before deleting
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

					if (existing.length > 0) {
						// Delete the record
						await db.delete(cameraDynamicRangeData).where(eq(cameraDynamicRangeData.id, recordId));
					}
					continue; // Skip to next record
				}

				// Build data object for insert/update
				const recordData: any = {
					cameraId: cameraId,
					userId: locals.user.id,
					updatedAt: new Date()
				};

				if (isNew) {
					// New record - set createdAt
					recordData.createdAt = new Date();
				} else {
					// Existing record - verify it belongs to this camera and user
					if (isNaN(recordId) || recordId <= 0) {
						continue; // Skip invalid IDs
					}

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
				}

				// Map fields from record to database columns
				if (record.ei !== undefined && record.ei !== '') {
					recordData.ei = parseInt(record.ei) || null;
				} else {
					recordData.ei = null;
				}

				if (record.iso !== undefined && record.iso !== '') {
					recordData.iso = parseInt(record.iso) || null;
				} else {
					recordData.iso = null;
				}

				if (record.specialMode !== undefined) {
					recordData.specialMode = record.specialMode.trim() || null;
				} else {
					recordData.specialMode = null;
				}

				if (record.codec !== undefined) {
					recordData.codec = record.codec.trim() || null;
				} else {
					recordData.codec = null;
				}

				if (record.log !== undefined) {
					recordData.log = record.log.trim() || null;
				} else {
					recordData.log = null;
				}

				if (record.bitDepth !== undefined && record.bitDepth !== '') {
					recordData.bitDepth = parseInt(record.bitDepth) || null;
				} else {
					recordData.bitDepth = null;
				}

				if (record.chromaSubsampling !== undefined) {
					recordData.chromaSubsampling = record.chromaSubsampling.trim() || null;
				} else {
					recordData.chromaSubsampling = null;
				}

				if (record.bitrate !== undefined) {
					recordData.bitrate = record.bitrate.trim() || null;
				} else {
					recordData.bitrate = null;
				}

				if (record.resolution !== undefined) {
					recordData.resolution = record.resolution.trim() || null;
				} else {
					recordData.resolution = null;
				}

				if (record.framerate !== undefined) {
					recordData.framerate = record.framerate.trim() || null;
				} else {
					recordData.framerate = null;
				}

				if (record.crop !== undefined) {
					recordData.crop = record.crop.trim() || null;
				} else {
					recordData.crop = null;
				}

				if (record.slopeBased !== undefined && record.slopeBased !== '') {
					recordData.slopeBased = parseFloat(record.slopeBased) || null;
				} else {
					recordData.slopeBased = null;
				}

				if (record.snr1 !== undefined && record.snr1 !== '') {
					recordData.snr1 = parseFloat(record.snr1) || null;
				} else {
					recordData.snr1 = null;
				}

				if (record.snr2 !== undefined && record.snr2 !== '') {
					recordData.snr2 = parseFloat(record.snr2) || null;
				} else {
					recordData.snr2 = null;
				}

				if (record.snr4 !== undefined && record.snr4 !== '') {
					recordData.snr4 = parseFloat(record.snr4) || null;
				} else {
					recordData.snr4 = null;
				}

				if (record.snr10 !== undefined && record.snr10 !== '') {
					recordData.snr10 = parseFloat(record.snr10) || null;
				} else {
					recordData.snr10 = null;
				}

				if (record.snr40 !== undefined && record.snr40 !== '') {
					recordData.snr40 = parseFloat(record.snr40) || null;
				} else {
					recordData.snr40 = null;
				}

				// Check if record has at least one non-null field (excluding metadata fields)
				const hasData = 
					recordData.ei !== null ||
					recordData.iso !== null ||
					recordData.specialMode !== null ||
					recordData.codec !== null ||
					recordData.log !== null ||
					recordData.bitDepth !== null ||
					recordData.chromaSubsampling !== null ||
					recordData.bitrate !== null ||
					recordData.resolution !== null ||
					recordData.framerate !== null ||
					recordData.crop !== null ||
					recordData.slopeBased !== null ||
					recordData.snr1 !== null ||
					recordData.snr2 !== null ||
					recordData.snr4 !== null ||
					recordData.snr10 !== null ||
					recordData.snr40 !== null;

				// Skip empty records
				if (!hasData) {
					continue;
				}

				// Insert new record or update existing one
				if (isNew) {
					await db.insert(cameraDynamicRangeData).values(recordData);
				} else {
					await db
						.update(cameraDynamicRangeData)
						.set(recordData)
						.where(eq(cameraDynamicRangeData.id, recordId));
				}
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
