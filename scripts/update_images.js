
const fs = require('fs');
const path = require('path');

const PRODUCTS_PATH = path.join(process.cwd(), 'lib/products.json');

async function checkUrlExists(url) {
    try {
        const response = await fetch(url, {
            method: 'HEAD',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

async function processVans(product) {
    if (product.brand !== 'Vans' || !product.image) return product;

    // Vans images often look like: .../Midres-Vans-V1002003300012-01.jpg?w=750&q=100
    // We want to find -02, -03, etc.
    const urlParts = product.image.split('?');
    const baseUrl = urlParts[0];
    const query = urlParts[1] ? `?${urlParts[1]}` : '';

    // Regex to find the index variant (e.g., -01, -02 at the end of filename)
    // Looking for -01.jpg or similar patterns
    const match = baseUrl.match(/-(\d{2})\.(jpg|jpeg|png)$/i);

    if (!match) {
        // Try fallback: maybe it doesn't have a number, append -02?
        // Usually Vans main img is -01 or -02.
        return product;
    }

    const currentNum = parseInt(match[1], 10);
    const extension = match[2];
    const prefix = baseUrl.substring(0, match.index); // part before -01

    let images = [product.image];
    // If current is not 01, we might miss previous ones? Assuming main image is the "first" interesting one.
    // Let's try to find next 4 images.

    for (let i = 1; i <= 5; i++) {
        const nextNum = currentNum + i;
        const nextNumStr = nextNum.toString().padStart(2, '0');
        const nextUrl = `${prefix}-${nextNumStr}.${extension}${query}`;

        // Avoid duplicates if manually added
        if (images.includes(nextUrl)) continue;

        console.log(`Checking Vans: ${nextUrl} ...`);
        const exists = await checkUrlExists(nextUrl);
        if (exists) {
            images.push(nextUrl);
        } else {
            // Optimization: if -02 doesn't exist, -03 unlikely exists? Vans usually sequential.
            // But sometimes they skip. Let's try consecutive failures break.
            break;
        }
    }

    // Also try checking "01" if the main image was "02" (sometimes happen)
    if (currentNum > 1) {
        const prevNum = currentNum - 1;
        const prevNumStr = prevNum.toString().padStart(2, '0');
        const prevUrl = `${prefix}-${prevNumStr}.${extension}${query}`;
        if (!images.includes(prevUrl)) {
            const exists = await checkUrlExists(prevUrl);
            if (exists) images.unshift(prevUrl);
        }
    }

    product.images = images;
    return product;
}

async function processNike(product) {
    if (product.brand !== 'Nike' || !product.image) return product;

    // Nike: https://imgnike-a.akamaihd.net/1920x1920/029484NX.jpg
    // Try appending A, B, C, D before the extension

    const urlParts = product.image.split('.');
    const ext = urlParts.pop(); // jpg
    const baseUrl = urlParts.join('.'); // .../029484NX

    let images = [product.image];

    // Try suffixes A, B, C, D
    const suffixes = ['A', 'B', 'C', 'D', 'E', 'F'];

    for (const suffix of suffixes) {
        const nextUrl = `${baseUrl}${suffix}.${ext}`;
        if (images.includes(nextUrl)) continue;

        console.log(`Checking Nike: ${nextUrl} ...`);
        const exists = await checkUrlExists(nextUrl);
        if (exists) {
            images.push(nextUrl);
        }
    }

    product.images = images;
    return product;
}

async function main() {
    const rawData = fs.readFileSync(PRODUCTS_PATH, 'utf8');
    let products = JSON.parse(rawData);

    console.log(`Processing ${products.length} products...`);

    // Process sequentially to be nice to servers/network
    // Or batch strictly limited.

    // Let's filter to only those needing update (single image or empty images) to save time
    // But user wants "Vans" specifically checked.

    for (let i = 0; i < products.length; i++) {
        let p = products[i];

        // Skip if already has many images (heuristic > 1) unless we want to force re-check
        // if (p.images && p.images.length > 1) continue; 

        if (p.brand === 'Vans') {
            products[i] = await processVans(p);
        } else if (p.brand === 'Nike') {
            products[i] = await processNike(p);
        }

        // Save every 10 items to show progress and keep mtime updated
        if (i % 10 === 0) {
            fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2));
            console.log(`Saved progress at item ${i}`);
        }
    }

    // Save progress occasionally or just at end? 
    // Let's save at end for safety of valid JSON
    // Final save
    fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2));
    console.log('Update complete.');
}

main();
