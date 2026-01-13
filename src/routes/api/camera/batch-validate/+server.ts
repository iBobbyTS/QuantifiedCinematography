import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { brands, productCameras } from '$lib/server/db/schema';

export const POST: RequestHandler = async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('csv') as File;

    if (!file) {
        return json({ error: 'No file uploaded' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n');

    // Fetch existing data from database
    const dbBrands = await db.select().from(brands);
    const dbCameras = await db.select().from(productCameras);

    const existingBrandNames = new Set(dbBrands.map((b) => b.name.toLowerCase()));
    const existingModelNames = new Set(dbCameras.map((c) => c.name.toLowerCase()));

    const validationResults = [];
    let validCount = 0;

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

        const brand = values[0].replace(/^"|"$/g, ''); // Remove surrounding quotes
        const model = values[1].replace(/^"|"$/g, '');
        const year = values[2].replace(/^"|"$/g, '');
        const cinemaRaw = values[3].replace(/^"|"$/g, '').trim();

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

        const brandExists = existingBrandNames.has(brand.toLowerCase());
        const modelExists = existingModelNames.has(model.toLowerCase());

        // Logic:
        // Brand: Green if exists (good), Blue if new (also fine, just info)
        // Model: Green if new (good), Red if exists (bad - duplicate)
        // Overall Valid: Model must NOT exist.

        const isValid = !modelExists;
        if (isValid) validCount++;

        validationResults.push({
            brand,
            model,
            year,
            isCinema,
            brandExists,
            modelExists,
            isValid
        });
    }

    return json({
        results: validationResults,
        validCount,
        totalCount: validationResults.length
    });
};
