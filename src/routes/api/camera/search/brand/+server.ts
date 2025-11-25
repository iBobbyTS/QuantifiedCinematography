import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { brands } from '$lib/server/db/schema.js';
import { like, ilike } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
    // Check login (optional, but good practice)
    if (!locals.user) {
        return json({ brands: [] }, { status: 401 });
    }

    try {
        const { query } = await request.json();

        if (!query || typeof query !== 'string') {
            return json({ brands: [] });
        }

        const searchTerm = `%${query.trim()}%`;

        const foundBrands = await db
            .select({
                id: brands.id,
                name: brands.name
            })
            .from(brands)
            .where(ilike(brands.name, searchTerm))
            .limit(10);

        return json({ brands: foundBrands });
    } catch (err) {
        console.error('Error searching brands:', err);
        return json({ brands: [] }, { status: 500 });
    }
};
