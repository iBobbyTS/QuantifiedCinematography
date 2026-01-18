import { error, redirect } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { productCameras, brands, cameraDynamicRangeData, user } from '$lib/server/db/schema.js';
import { UserPermissions, USER_PERMISSIONS } from '$lib/permission/bitmask.js';
import { eq, inArray, sql } from 'drizzle-orm';

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

// Sort cameras using natural sort (same as browse page)
function sortCameras(cameras: any[]): any[] {
	const sorted = [...cameras];

	sorted.sort((a, b) => {
		const brandA = (a.brandName || '').trim();
		const brandB = (b.brandName || '').trim();
		const brandCompare = naturalCompare(brandA, brandB);
		if (brandCompare !== 0) {
			return brandCompare;
		}

		const nameA = (a.name || '').trim();
		const nameB = (b.name || '').trim();
		const nameCompare = naturalCompare(nameA, nameB);
		if (nameCompare !== 0) {
			return nameCompare;
		}

		return 0;
	});

	return sorted;
}

export const load: ServerLoad = async ({ locals, url }) => {
	// Parse camera IDs from URL query parameter
	const idParam = url.searchParams.get('id');
	let selectedCameraIds: number[] = [];
	if (idParam) {
		selectedCameraIds = idParam
			.split(',')
			.map((id) => parseInt(id.trim()))
			.filter((id) => !isNaN(id) && id > 0);
	}
	// Check login
	if (!locals.user) {
		throw redirect(302, '/user/login');
	}

	// Check permission (CAMERA or ADMINISTRATOR)
	const hasCameraPermission = UserPermissions.hasPermission(
		locals.user.permission,
		USER_PERMISSIONS.CAMERA
	);
	const hasAdminPermission = UserPermissions.hasPermission(
		locals.user.permission,
		USER_PERMISSIONS.ADMINISTRATOR
	);

	if (!hasCameraPermission && !hasAdminPermission) {
		throw error(403, { message: 'Access denied. Camera permission required.' });
	}

	try {
		// Fetch all cameras with brand names
		const allCameras = await db
			.select({
				id: productCameras.id,
				name: productCameras.name,
				brandId: productCameras.brandId,
				brandName: brands.name,
				releaseYear: productCameras.releaseYear,
				cinema: productCameras.cinema
			})
			.from(productCameras)
			.leftJoin(brands, eq(productCameras.brandId, brands.id));

		// Sort cameras using natural sort (same as browse page default: brand ASC, name ASC)
		const sortedCameras = sortCameras(allCameras);

		// Fetch all dynamic range data for all cameras (all users' data)
		const cameraIds = sortedCameras.map((c) => c.id);
		let allDynamicRangeData: any[] = [];

		if (cameraIds.length > 0) {
			try {
				allDynamicRangeData = await db
					.select({
						id: cameraDynamicRangeData.id,
						cameraId: cameraDynamicRangeData.cameraId,
						userId: cameraDynamicRangeData.userId,
						ei: cameraDynamicRangeData.ei,
						iso: cameraDynamicRangeData.iso,
						specialMode: cameraDynamicRangeData.specialMode,
						codec: cameraDynamicRangeData.codec,
						log: cameraDynamicRangeData.log,
						bitDepth: cameraDynamicRangeData.bitDepth,
						chromaSubsampling: cameraDynamicRangeData.chromaSubsampling,
						bitrate: cameraDynamicRangeData.bitrate,
						resolution: cameraDynamicRangeData.resolution,
						framerate: cameraDynamicRangeData.framerate,
						crop: cameraDynamicRangeData.crop,
						slopeBased: cameraDynamicRangeData.slopeBased,
						snr1: cameraDynamicRangeData.snr1,
						snr2: cameraDynamicRangeData.snr2,
						snr4: cameraDynamicRangeData.snr4,
						snr10: cameraDynamicRangeData.snr10,
						snr40: cameraDynamicRangeData.snr40,
						userNickname: user.nickname
					})
					.from(cameraDynamicRangeData)
					.leftJoin(user, eq(cameraDynamicRangeData.userId, user.id))
					.where(inArray(cameraDynamicRangeData.cameraId, cameraIds));
			} catch (err: any) {
				// If table doesn't exist, return empty array
				if (err?.code === '42P01' || err?.message?.includes('does not exist')) {
					console.warn('camera_dynamic_range_data table does not exist yet');
					allDynamicRangeData = [];
				} else {
					throw err;
				}
			}
		}

		// Group dynamic range data by camera ID
		const dataByCamera = new Map<number, any[]>();
		for (const record of allDynamicRangeData) {
			if (!dataByCamera.has(record.cameraId)) {
				dataByCamera.set(record.cameraId, []);
			}
			dataByCamera.get(record.cameraId)!.push(record);
		}

		// Add dynamic range data to cameras
		const camerasWithData = sortedCameras.map((camera) => ({
			...camera,
			dynamicRangeData: dataByCamera.get(camera.id) || []
		}));

		// Fetch users who have camera permission and have uploaded dynamic range data
		let uploaders: Array<{ id: string; nickname: string }> = [];
		try {
			// Get distinct user IDs from dynamic range data
			const distinctUserIds = await db
				.selectDistinct({ userId: cameraDynamicRangeData.userId })
				.from(cameraDynamicRangeData);
			
			if (distinctUserIds.length > 0) {
				const userIds = distinctUserIds.map(u => u.userId).filter(Boolean) as string[];
				
				// Fetch users who have camera permission
				const usersWithPermission = await db
					.select({
						id: user.id,
						nickname: user.nickname,
						permission: user.permission
					})
					.from(user)
					.where(inArray(user.id, userIds));
				
				// Filter users who have CAMERA permission
				uploaders = usersWithPermission
					.filter(u => UserPermissions.hasPermission(u.permission, USER_PERMISSIONS.CAMERA))
					.map(u => ({ id: u.id, nickname: u.nickname }))
					.sort((a, b) => a.nickname.localeCompare(b.nickname));
			}
		} catch (err: any) {
			// If table doesn't exist, return empty array
			if (err?.code === '42P01' || err?.message?.includes('does not exist')) {
				console.warn('Error fetching uploaders:', err);
				uploaders = [];
			} else {
				console.error('Error fetching uploaders:', err);
				uploaders = [];
			}
		}

		return {
			cameras: camerasWithData,
			selectedCameraIds: selectedCameraIds,
			uploaders: uploaders
		};
	} catch (err) {
		console.error('Failed to load cameras and dynamic range data:', err);
		throw error(500, { message: 'Failed to load data' });
	}
};
