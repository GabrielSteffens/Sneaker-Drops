
const fs = require('fs');
const path = require('path');

const PRODUCTS_PATH = path.join(process.cwd(), 'lib/products.json');

// Fake User-Agent to avoid immediate blocking
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
};

function saveProducts(products) {
    fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2));
    console.log('Saved progress to file.');
}

async function checkUrlExists(url) {
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 2000); // 2s timeout
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

async function processPuma(product) {
    if (product.brand !== 'Puma' || !product.image) return product;

    // Only process if we don't have images yet
    if (product.images && product.images.length > 2) return product;

    console.log(`[Puma] Processing ${product.title}...`);
    // Existing logic for Puma (it works)
    // Image: https://images.puma.com/.../01/sv01/fnd/BRA/fmt/png
    // Variants: sv01, bv, dt01, mod01, mod02, fl

    const variants = ['sv01', 'bv', 'dt01', 'mod01', 'mod02', 'fl'];

    let images = [];

    // Try to blindly replace known variants if they exist in the url
    let baseUrl = product.image;
    let foundVariant = null;

    for (const v of variants) {
        if (baseUrl.includes(`/${v}/`)) {
            foundVariant = v;
            break;
        }
    }

    if (!foundVariant) {
        images = [product.image]; // Keep original
    } else {
        for (const v of variants) {
            const newUrl = baseUrl.replace(`/${foundVariant}/`, `/${v}/`);
            if (await checkUrlExists(newUrl)) {
                images.push(newUrl);
            }
        }
    }

    if (images.length === 0) images.push(product.image);

    product.images = [...new Set(images)];
    return product;
}

async function processVans(product) {
    if (product.brand !== 'Vans' || !product.image) return product;

    // Only process if we don't have images yet
    if (product.images && product.images.length > 2) return product;

    console.log(`[Vans] Processing ${product.title}...`);

    // Logic: -01.jpg, -02.jpg ...
    const urlParts = product.image.split('?');
    const baseUrl = urlParts[0];
    const query = urlParts[1] ? `?${urlParts[1]}` : '';

    const match = baseUrl.match(/-(\d{2})\.(jpg|jpeg|png)$/i);

    let images = [product.image];

    if (match) {
        const currentNum = parseInt(match[1], 10);
        const extension = match[2];
        const prefix = baseUrl.substring(0, match.index);

        // Check 1 to 6
        for (let i = 1; i <= 6; i++) {
            const numStr = i.toString().padStart(2, '0');
            const nextUrl = `${prefix}-${numStr}.${extension}${query}`;

            if (images.includes(nextUrl)) continue;

            const exists = await checkUrlExists(nextUrl);
            if (exists) {
                images.push(nextUrl);
            }
        }
    }

    product.images = [...new Set(images)];
    return product;
}

async function processNike(product) {
    if (product.brand !== 'Nike') return product;

    if (product.images && product.images.length > 1) return product;

    console.log(`[Nike] Scrapping page for ${product.title}...`);

    if (!product.link) return product;

    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 10000); // 10s timeout for page load

        const response = await fetch(product.link, {
            headers: HEADERS,
            signal: controller.signal
        });
        clearTimeout(id);

        if (!response.ok) {
            console.log(`   Failed to fetch page: ${response.status}`);
            return product;
        }

        const html = await response.text();

        // Regex Strategy: Find all URLs that look like Nike product images
        // Pattern: https://imgnike-a.akamaihd.net/... .jpg or .png
        // We look for them inside src="..." or data-src="..." or just raw strings in JSON

        const candidateSet = new Set();
        candidateSet.add(product.image);

        // Broad regex for URLs
        // Captures: https://imgnike-a.akamaihd.net/1920x1920/029484NX.jpg
        const regex = /https:\/\/imgnike-a\.akamaihd\.net\/[^"'\s<>\\]+\.(jpg|png)/gi;

        let match;
        while ((match = regex.exec(html)) !== null) {
            let url = match[0];
            // Basic cleanup if needed
            if (!url.includes('icon') && !url.includes('loading') && url.length > 20) {
                candidateSet.add(url);
            }
        }

        const bestImages = Array.from(candidateSet).sort();

        if (bestImages.length > 1) {
            // Limit to reasonable number
            product.images = bestImages.slice(0, 8);
            console.log(`   Found ${product.images.length} images.`);
        } else {
            console.log(`   No extra images found via regex.`);
        }

    } catch (e) {
        console.error(`   Error scraping Nike: ${e.message}`);
    }

    return product;
}

async function main() {
    console.log("Starting Robust Update...");
    const rawData = fs.readFileSync(PRODUCTS_PATH, 'utf8');
    let products = JSON.parse(rawData);

    for (let i = 0; i < products.length; i++) {
        const p = products[i];

        try {
            if (p.brand === 'Puma') {
                products[i] = await processPuma(p);
            } else if (p.brand === 'Vans') {
                products[i] = await processVans(p);
            } else if (p.brand === 'Nike') {
                products[i] = await processNike(p);
                // Sleep a bit for Nike to be polite
                await new Promise(pkg => setTimeout(pkg, 500));
            }
        } catch (e) {
            console.error(`Error processing item ${i}: ${e}`);
        }

        if (i % 5 === 0) {
            saveProducts(products);
        }
    }

    saveProducts(products);
    console.log("Done.");
}

main();
