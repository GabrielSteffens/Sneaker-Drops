
import fs from 'fs';
import path from 'path';

export async function GET() {
    // In a real app we'd track the process better. 
    // Here we check if the script is still writing or running.
    // For simplicity, we can just return a mocked status since we know it's running in background.
    // Or we could check if products.json was recently modified.

    // BUT since I cannot easily share state between the background node process and Next.js server comfortably without file/db,
    // I will just return 'running' if it's within a reasonable timeframe of me starting it, or implement a lock file.

    // Let's check for a lock file that the script COULD create, but I didn't add that.
    // Instead I'll just check if products.json modification time is very recent (< 10 seconds).

    const productsPath = path.join(process.cwd(), 'lib/products.json');
    try {
        const stats = fs.statSync(productsPath);
        const now = new Date();
        const diff = (now - stats.mtime) / 1000;

        // If modified in last 60 seconds, assume active
        if (diff < 60) {
            return Response.json({ status: 'running' });
        }
    } catch (e) { }

    // Fallback: Check if we are still "processing"
    return Response.json({ status: 'idle' });
}
