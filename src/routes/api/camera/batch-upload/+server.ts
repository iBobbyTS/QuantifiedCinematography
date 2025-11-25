```
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
	const headers = lines[0].split(',').map((h) => h.trim());

	const addedItems: string[] = [];
	let addedCount = 0;

	// Simple CSV parsing (ignoring quotes/commas in values for now as per simple requirement)
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const values = line.split(',').map((v) => v.trim());
		if (values.length < 4) continue;

		const brand = values[0];
		const model = values[1];
		// const year = values[2];
		const cinemaRaw = values[3];

		let isCinema = false;
		if (cinemaRaw) {
			const lower = cinemaRaw.toLowerCase();
			if (lower === 'y' || lower === 'true') isCinema = true;
			else if (lower === 'n' || lower === 'false') isCinema = false;
		}

		addedItems.push(`${ brand } ${ model } (Cinema: ${ isCinema ? 'Yes' : 'No'})`);
		addedCount++;
	}

	// Simulate processing delay
	await new Promise((resolve) => setTimeout(resolve, 1000));

	return json({
		added_count: addedCount,
		existing_count: 0,
		total_processed: addedCount,
		added_items: addedItems,
		file_name: file.name
	});
};
```
