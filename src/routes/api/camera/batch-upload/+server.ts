import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { brands, productCameras } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('csv') as File;

    if (!file) {
        return json({ error: 'No file uploaded' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n');

    const addedItems: string[] = [];
    const addedBrands: string[] = [];
    const failedItems: { brand: string; model: string; reason: string }[] = [];
    let addedCount = 0;
    let existingCount = 0;

    // Fetch existing brands for ID lookup
    const dbBrands = await db.select().from(brands);
    const brandMap = new Map(dbBrands.map((b) => [b.name.toLowerCase(), b.id]));

    // CSV parsing function that handles quoted fields
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

    // Simple CSV parsing
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        if (values.length < 4) continue;

        const brandName = values[0].replace(/^"|"$/g, ''); // Remove surrounding quotes
        const modelName = values[1].replace(/^"|"$/g, '');
        const yearStr = values[2].replace(/^"|"$/g, '');
        const cinemaRaw = values[3].replace(/^"|"$/g, '').trim();

        let brandId = brandMap.get(brandName.toLowerCase());

        // If brand doesn't exist, create it
        if (!brandId) {
            try {
                const [newBrand] = await db.insert(brands).values({ name: brandName }).returning({ id: brands.id });
                brandId = newBrand.id;
                brandMap.set(brandName.toLowerCase(), brandId); // Update map for subsequent items
                addedBrands.push(brandName);
            } catch (error) {
                console.error(`Failed to create brand ${brandName}:`, error);
                failedItems.push({ brand: brandName, model: modelName, reason: 'create_brand_error' });
                continue;
            }
        }

        // Parse cinema field: convert various string formats to boolean
        let isCinema = false;
        if (cinemaRaw) {
            const trimmed = cinemaRaw.trim();
            const lower = trimmed.toLowerCase();
            // Accept: 1, T, t, True, true, Y, y, Yes, YES, yes
            if (lower === '1' || lower === 't' || lower === 'true' || lower === 'y' || lower === 'yes') {
                isCinema = true;
            } else if (lower === '0' || lower === 'f' || lower === 'false' || lower === 'n' || lower === 'no') {
                isCinema = false;
            }
            // Default is false if not recognized
        }

        // Check if camera already exists
        const existingCamera = await db.query.productCameras.findFirst({
            where: and(
                eq(productCameras.brandId, brandId),
                eq(productCameras.name, modelName) // Exact match for now, or case-insensitive if needed
            )
        });

        if (existingCamera) {
            existingCount++;
            failedItems.push({ brand: brandName, model: modelName, reason: 'already_exists' });
            continue;
        }

        try {
            await db.insert(productCameras).values({
                brandId: brandId,
                name: modelName,
                releaseYear: parseInt(yearStr) || null,
                cinema: isCinema
            });
            addedItems.push(`${brandName} ${modelName}`);
            addedCount++;
        } catch (error) {
            console.error(`Failed to add camera ${brandName} ${modelName}:`, error);
            failedItems.push({ brand: brandName, model: modelName, reason: 'db_error' });
        }
    }

    return json({
        added_count: addedCount,
        existing_count: existingCount,
        total_processed: lines.length - 1, // approximate
        added_items: addedItems,
        added_brands: addedBrands,
        failed_items: failedItems,
        file_name: file.name
    });
};
