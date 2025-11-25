import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { productCameras } from '$lib/server/db/schema.js';
import { ilike, sql } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
    // Check login
    if (!locals.user) {
        return json({ exists: false, similar: [] }, { status: 401 });
    }

    try {
        const { name } = await request.json();

        if (!name || typeof name !== 'string') {
            return json({ exists: false, similar: [] });
        }

        const trimmedName = name.trim();

        // Check for exact match (case-insensitive)
        const exactMatch = await db
            .select()
            .from(productCameras)
            .where(ilike(productCameras.name, trimmedName))
            .limit(1);

        const exists = exactMatch.length > 0;

        // Check for similar names using trigram similarity or just simple like for now
        // Since pg_trgm might not be enabled, we'll use a simple ILIKE with wildcards or Levenshtein if available in JS
        // But user asked for "A7 M4" vs "A7M4" vs "A7R4". 
        // A simple approach is to remove spaces and check, or use similarity if DB supports it.
        // Let's try a flexible ILIKE approach for now: replace spaces with %

        const flexibleTerm = `%${trimmedName.split('').join('%')}%`; // Very loose
        // Better: split by space and join with %
        const parts = trimmedName.split(/\s+/).filter(p => p.length > 0);
        const searchPattern = `%${parts.join('%')}%`;

        // Also check for "A7M4" if input is "A7 M4" (remove spaces)
        const noSpaceName = trimmedName.replace(/\s+/g, '');

        // We want to find names that are similar.
        // Let's fetch names that match the loose pattern or the no-space pattern
        // We limit to 5 similar items

        const similarCameras = await db
            .select({ name: productCameras.name })
            .from(productCameras)
            .where(
                sql`${productCameras.name} ILIKE ${searchPattern} OR REPLACE(${productCameras.name}, ' ', '') ILIKE ${noSpaceName}`
            )
            .limit(5);

        // Filter out the exact match from similar list if it exists
        const similar = similarCameras
            .map(c => c.name)
            .filter(n => n.toLowerCase() !== trimmedName.toLowerCase());

        return json({ exists, similar });
    } catch (err) {
        console.error('Error checking camera name:', err);
        return json({ exists: false, similar: [] }, { status: 500 });
    }
};
