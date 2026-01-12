import type { ServerLoad } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { productCameras } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';

export const load: ServerLoad = async ({ locals }) => {
    try {
        // Count cameras (cinema = false)
        const cameraCountResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(productCameras)
            .where(eq(productCameras.cinema, false));
        const cameraCount = cameraCountResult[0]?.count ?? 0;

        // Count cinema cameras (cinema = true)
        const cinemaCountResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(productCameras)
            .where(eq(productCameras.cinema, true));
        const cinemaCount = cinemaCountResult[0]?.count ?? 0;

        return {
            cameraCount,
            cinemaCount
        };
    } catch (err) {
        console.error('Failed to load camera counts:', err);
        // Return default values on error
        return {
            cameraCount: 0,
            cinemaCount: 0
        };
    }
};
