import fs from 'fs';
import path from 'path';

// Note: In Next.js App Router, this will run on the server.
const DB_PATH = path.join(process.cwd(), 'lib/products.json');

export async function getProducts() {
    try {
        const fileContents = fs.readFileSync(DB_PATH, 'utf8');
        const data = JSON.parse(fileContents);
        return data;
    } catch (error) {
        console.error('Error reading products:', error);
        return [];
    }
}
