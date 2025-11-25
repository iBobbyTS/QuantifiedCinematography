import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
    const csvContent = 'brand,model,release_year,cinema\nARRI,Alexa Mini,2015,Y\nSony,a7 IV,2021,N';
    return new Response(csvContent, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="camera_template.csv"'
        }
    });
};
