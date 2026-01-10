const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const DB_PATH = path.join(__dirname, '../lib/products.json');

const URLS = {
    Vans: {
        release: "https://www.vans.com.br/c/novidades?q=:creation-time:shoeSize:43&page=0",
        promo: "https://www.vans.com.br/c/promocao?q=:creation-time:shoeSize:43&page=0"
    },
    Nike: {
        release: "https://www.nike.com.br/nav/tamanho/43/tipodeproduto/calcados?sorting=DescReleaseDate",
        promo: "https://www.nike.com.br/nav/genero/masculino/ofertas/emoferta/tamanho/43/tipodeproduto/calcados"
    },
    Puma: {
        release: "https://br.puma.com/lancamentos?limit=16&refine=c_productDivision%3DCal%C3%A7ados&sort=best-matches",
        promo: "https://br.puma.com/outlet/homens/calcados"
    }
};

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

let browserInstance = null;

async function getBrowser() {
    if (!browserInstance) {
        browserInstance = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-features=site-per-process']
        });
    }
    return browserInstance;
}

// --- PUMA IMAGE GENERATOR (Pattern Based) ---
function generatePumaImages(mainImage) {
    if (!mainImage || !mainImage.includes('images.puma.com')) return [mainImage];

    // Pattern: .../sv01/... -> replace sv01 with bv, fl, dt01, mod01, mod02
    // URL example: https://images.puma.com/image/upload/f_auto,q_auto,w_600,b_rgb:FAFAFA/global/312130/01/sv01/fnd/BRA/fmt/png

    // Some URLs might not have sv01 explicitly or have different structure.
    // But usually global/{SKU}/{COLOR}/{VIEW}/...

    const views = ['sv01', 'bv', 'dt01', 'mod01', 'mod02', 'fl'];
    const images = [];

    if (mainImage.includes('/sv01/')) {
        views.forEach(v => {
            images.push(mainImage.replace('/sv01/', `/${v}/`));
        });
    } else {
        // If we can't detect standard view, just return main
        images.push(mainImage);
    }

    return images;
}

// --- NIKE SCRAPER ---
async function scrapeNike(baseUrl, type) {
    const SIZES = [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];
    const productMap = new Map();

    console.log(`Scraping Nike (${type})...`);

    // Only scrape one size loosely for speed, then others if needed, 
    // BUT user wants all items. Loops are fine. 
    // To speed up, we can reduce overlapping work if API allows, but stick to loop for safety.

    for (const size of SIZES) {
        let url;
        if (type === 'promotion') {
            url = `https://www.nike.com.br/nav/ofertas/emoferta/tamanho/${size}/tipodeproduto/calcados`;
        } else {
            url = `https://www.nike.com.br/nav/genero/masculino/idade/adulto/tamanho/${size}/tipodeproduto/calcados?sorting=DescReleaseDate`;
        }

        try {
            const { data } = await axios.get(url, { headers: HEADERS });
            const $ = cheerio.load(data);
            const scriptContent = $('#__NEXT_DATA__').html();

            if (scriptContent) {
                const json = JSON.parse(scriptContent);
                const products = json.props.pageProps.data?.products || [];

                for (const p of products) {
                    const id = p.id;
                    if (!productMap.has(id)) {
                        productMap.set(id, {
                            id: id || crypto.randomUUID(),
                            brand: 'Nike',
                            title: p.name,
                            price: p.oldPrice || p.price,
                            discountPrice: p.oldPrice ? p.price : null,
                            image: `https://imgnike-a.akamaihd.net/1920x1920/${p.id}.jpg`,
                            images: [`https://imgnike-a.akamaihd.net/1920x1920/${p.id}.jpg`], // Fallback single image for Nike
                            link: p.url.startsWith('http') ? p.url : `https://www.nike.com.br${p.url}`,
                            type: type,
                            availableSizes: new Set(),
                            dateAdded: new Date().toISOString()
                        });
                    }
                    productMap.get(id).availableSizes.add(size);
                }
            }
        } catch (e) {
            // ignore
        }
        await new Promise(r => setTimeout(r, 100));
    }

    const aggregatedProducts = Array.from(productMap.values()).map(p => ({
        ...p,
        availableSizes: Array.from(p.availableSizes).sort((a, b) => a - b)
    }));

    console.log(`Aggregated ${aggregatedProducts.length} unique Nike ${type} products.`);
    return aggregatedProducts;
}

// --- VANS SCRAPER & DEEP FETCH ---
async function scrapeVans(baseUrl, type) {
    const SIZES = [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];
    const MAX_PAGES = 5; // Reduced pages for demo, increase if needed
    const productMap = new Map();

    console.log(`Scraping Vans (${type})...`);

    const browser = await getBrowser();
    const page = await browser.newPage();

    // Block resources for main listing speed
    await page.setRequestInterception(true);
    const interceptor = (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) req.abort();
        else req.continue();
    };
    page.on('request', interceptor);

    try {
        await page.setViewport({ width: 1366, height: 768 });

        for (const size of SIZES) {
            let pageNum = 0;
            // Limit deep scraping for time being
            while (pageNum < 3) {
                let url = type === 'promotion'
                    ? `https://www.vans.com.br/c/promocao?q=:creation-time:category:SAPATOS:shoeSize:${size}&page=${pageNum}`
                    : `https://www.vans.com.br/c/novidades?q=:creation-time:shoeSize:${size}&page=${pageNum}`;

                try {
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

                    const products = await page.evaluate((type) => {
                        const items = [];
                        const links = Array.from(document.querySelectorAll('a[href*="/p/"]'));
                        const uniqueLinks = new Set();
                        links.forEach(a => {
                            const href = a.getAttribute('href');
                            if (uniqueLinks.has(href)) return;
                            uniqueLinks.add(href);
                            const container = a.closest('div') || a;
                            const text = container.innerText;
                            const flowPriceMatch = text.match(/R\$\s?([\d,.]+)/);
                            const img = container.querySelector('img');
                            const title = img ? img.getAttribute('alt') : '';
                            if (flowPriceMatch) {
                                const priceVal = parseFloat(flowPriceMatch[1].replace('.', '').replace(',', '.'));
                                items.push({
                                    title: title || 'Vans Product',
                                    price: priceVal,
                                    image: img ? img.src : null,
                                    link: href
                                });
                            }
                        });
                        return items;
                    }, type);

                    if (products.length === 0) break;

                    for (const p of products) {
                        const id = crypto.createHash('md5').update(p.link).digest('hex').substring(0, 8);
                        if (!productMap.has(id)) {
                            productMap.set(id, {
                                id: id,
                                brand: 'Vans',
                                title: p.title.length > 5 ? p.title : 'Vans Sneaker',
                                price: p.price,
                                discountPrice: type === 'promotion' ? Math.floor(p.price * 0.9) : null,
                                image: p.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
                                images: [], // Will populate later
                                link: p.link.startsWith('http') ? p.link : `https://www.vans.com.br${p.link}`,
                                type: type,
                                availableSizes: new Set(),
                                dateAdded: new Date().toISOString()
                            });
                        }
                        productMap.get(id).availableSizes.add(size);
                    }
                    pageNum++;
                } catch (e) { break; }
            }
        }
    } finally {
        page.off('request', interceptor);
        await page.close();
    }

    // --- DEEP SCRAPE VANS IMAGES ---
    console.log(`Deep scraping ${productMap.size} Vans items for images... (this might take a while)`);
    const allItems = Array.from(productMap.values());
    const CHUNK_SIZE = 5; // Parallel tabs

    for (let i = 0; i < allItems.length; i += CHUNK_SIZE) {
        const chunk = allItems.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (item) => {
            try {
                const pPage = await browser.newPage();
                // Block images/fonts on product page too to load HTML fast, we just need the URLs in DOM
                await pPage.setRequestInterception(true);
                pPage.on('request', (req) => {
                    if (['image', 'font', 'stylesheet', 'media'].includes(req.resourceType())) req.abort();
                    else req.continue();
                });

                await pPage.goto(item.link, { waitUntil: 'domcontentloaded', timeout: 20000 });

                const imageUrls = await pPage.evaluate(() => {
                    // Vans logic: main gallery
                    const imgs = Array.from(document.querySelectorAll('img'))
                        .map(i => i.src)
                        .filter(src => src.includes('vans.com.br') && src.includes('Midres') && !src.includes('Thumbnail'));
                    return [...new Set(imgs)];
                });

                if (imageUrls.length > 0) {
                    item.images = imageUrls;
                    item.image = imageUrls[0]; // Update main image to high res
                } else {
                    item.images = [item.image];
                }
                await pPage.close();
            } catch (e) {
                console.log(`Failed to deep scrape ${item.title}`);
                if (!item.images || item.images.length === 0) item.images = [item.image];
            }
        }));
        console.log(`Processed ${Math.min(i + CHUNK_SIZE, allItems.length)} / ${allItems.length} Vans`);
    }

    const aggregatedProducts = allItems.map(p => ({
        ...p,
        availableSizes: Array.from(p.availableSizes).sort((a, b) => a - b)
    }));

    return aggregatedProducts;
}

// --- PUMA SCRAPER ---
async function scrapePuma(url, type) {
    console.log(`Scraping Puma (${type})...`);
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    const items = [];
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Scroll Logic
        await page.evaluate(async () => {
            const distance = 150;
            const MAX_SCROLLS = 100;
            for (let i = 0; i < MAX_SCROLLS; i++) {
                window.scrollBy(0, distance);
                await new Promise(r => setTimeout(r, 100));
                if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight) break;
            }
        });

        // Wait for hydration
        await new Promise(r => setTimeout(r, 2000));

        const products = await page.evaluate(() => {
            const extracted = [];
            const cards = document.querySelectorAll('.css-v5fr4o');

            cards.forEach(card => {
                const titleEl = card.querySelector('h3');
                const title = titleEl ? titleEl.innerText : 'Puma Product';

                const text = card.innerText;
                const priceMatch = text.match(/R\$\s?([\d,.]+)/);
                let price = priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) : 999.99;

                let link = '#';
                const linkEl = card.closest('a');
                if (linkEl) link = linkEl.href;

                let image = null;
                const parent = card.parentElement;
                if (parent) {
                    const imgEl = parent.querySelector('img');
                    if (imgEl) image = imgEl.src;
                }

                extracted.push({ title, price, image, link });
            });
            return extracted;
        });

        products.forEach(p => {
            const id = crypto.createHash('md5').update(p.link + p.title).digest('hex').substring(0, 8);
            const generatedImages = generatePumaImages(p.image);

            items.push({
                id: id,
                brand: 'Puma',
                title: p.title,
                price: p.price,
                discountPrice: type === 'promotion' ? Math.floor(p.price * 0.9) : null,
                image: p.image,
                images: generatedImages.length > 0 ? generatedImages : [p.image],
                link: p.link,
                type: type,
                availableSizes: [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44],
                dateAdded: new Date().toISOString()
            });
        });

    } catch (e) {
        console.error(`Error Puma: ${e.message}`);
    } finally {
        await page.close();
    }
    console.log(`Scraped ${items.length} Puma items.`);
    return items;
}


async function main() {
    console.log("Starting update process (Deep Scrape Enabled)...");
    let allProducts = [];

    // Puma
    allProducts = allProducts.concat(await scrapePuma(URLS.Puma.release, 'release'));
    allProducts = allProducts.concat(await scrapePuma(URLS.Puma.promo, 'promotion'));

    // Vans (This will take time due to deep scraping)
    allProducts = allProducts.concat(await scrapeVans(URLS.Vans.release, 'release'));
    allProducts = allProducts.concat(await scrapeVans(URLS.Vans.promo, 'promotion'));

    // Nike
    allProducts = allProducts.concat(await scrapeNike(URLS.Nike.release, 'release'));
    allProducts = allProducts.concat(await scrapeNike(URLS.Nike.promo, 'promotion'));

    if (browserInstance) await browserInstance.close();

    fs.writeFileSync(DB_PATH, JSON.stringify(allProducts, null, 2));
    console.log(`Updated database with ${allProducts.length} items.`);
}

main();
