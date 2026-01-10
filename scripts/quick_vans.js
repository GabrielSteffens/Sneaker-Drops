
const fs = require('fs');
const path = require('path');

const PRODUCTS_PATH = path.join(process.cwd(), 'lib/products.json');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*'
};

function saveProducts(products) {
    fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2));
    console.log('Saved progress to file.');
}

async function checkUrlExists(url) {
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 2000);
        const response = await fetch(url, {
            method: 'HEAD',
            headers: HEADERS,
            signal: controller.signal
        });
        clearTimeout(id);
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

async function processVans(product) {
    if (product.brand !== 'Vans' || !product.image) return product;

    // Skip if already has images
    if (product.images && product.images.length > 2) return product;

    console.log(`[Vans] Processing ${product.title}...`);

    const urlParts = product.image.split('?');
    const baseUrl = urlParts[0];
    const query = urlParts[1] ? `?${urlParts[1]}` : '';

    // Match -01.jpg, -02.jpg, etc.
    const match = baseUrl.match(/-(\d{2})\.(jpg|jpeg|png)$/i);

    let images = [product.image];

    if (match) {
        const currentNum = parseInt(match[1], 10);
        const extension = match[2];
        const prefix = baseUrl.substring(0, match.index);

        // Try images 01 through 06
        for (let i = 1; i <= 6; i++) {
            const numStr = i.toString().padStart(2, '0');
            const nextUrl = `${prefix}-${numStr}.${extension}${query}`;

            // Avoid duplicates
            if (images.includes(nextUrl)) continue;

            // Optimization: If it's sequential, we can just check.
            const exists = await checkUrlExists(nextUrl);
            if (exists) {
                images.push(nextUrl);
            }
        }
    }

    // Sort logic? Usually defined by number.
    // Let's just keep them in order of discovery (01..06)
    // But since we pushed them, standard sort might be safer if we want 01 first.
    images.sort();

    product.images = [...new Set(images)];
    console.log(`   -> Found ${product.images.length} images.`);
    return product;
}

async function main() {
    console.log("Starting Quick Vans Update...");
    const rawData = fs.readFileSync(PRODUCTS_PATH, 'utf8');
    let products = JSON.parse(rawData);

    let changed = false;

    // Filter to process ONLY Vans
    for (let i = 0; i < products.length; i++) {
        const p = products[i];

        if (p.brand === 'Vans') {
            products[i] = await processVans(p);
            changed = true;
        }

        // Save every 20 items or so
        if (i % 20 === 0 && changed) {
            saveProducts(products);
            changed = false;
        }
    }

    saveProducts(products);
    console.log("Done.");
}

main();
