import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('csv') as File;

    if (!file) {
        return json({ error: 'No file uploaded' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n');

    // Mock database of existing brands/models for validation
    const existingBrands = ['ARRI', 'RED', 'Sony', 'Canon', 'Blackmagic'];
    const existingModels = ['Alexa Mini', 'Komodo', 'FX6', 'C70'];

    const validationResults = [];
    let validCount = 0;

    // Simple CSV parsing
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map((v) => v.trim());
        if (values.length < 4) continue;

        const brand = values[0];
        const model = values[1];
        const year = values[2];
        const cinemaRaw = values[3];

        let isCinema = false;
        if (cinemaRaw) {
            const lower = cinemaRaw.toLowerCase();
            if (lower === 'y' || lower === 'true') isCinema = true;
            else if (lower === 'n' || lower === 'false') isCinema = false;
        }

        const brandExists = existingBrands.some(b => b.toLowerCase() === brand.toLowerCase());
        const modelExists = existingModels.some(m => m.toLowerCase() === model.toLowerCase());

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

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return json({
        results: validationResults,
        validCount,
        totalCount: validationResults.length
    });
};
