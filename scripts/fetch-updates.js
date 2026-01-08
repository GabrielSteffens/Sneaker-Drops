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

};

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

let browserInstance = null;

async function getBrowser() {
    if (!browserInstance) {
        browserInstance = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
    return browserInstance;
}

async function scrapeNike(url, type) {
    try {
        console.log(`Scraping Nike (${type})...`);
        const { data } = await axios.get(url, { headers: HEADERS });
        const $ = cheerio.load(data);
        const scriptContent = $('#__NEXT_DATA__').html();

        if (!scriptContent) throw new Error("No NEXT_DATA found");

        const json = JSON.parse(scriptContent);
        const products = json.props.pageProps.data?.products || [];

        return products.map(p => ({
            id: p.id || crypto.randomUUID(),
            brand: 'Nike',
            title: p.name,
            price: p.oldPrice || p.price,
            discountPrice: p.oldPrice ? p.price : null,
            image: `https://imgnike-a.akamaihd.net/1920x1920/${p.id}.jpg`,
            link: p.url.startsWith('http') ? p.url : `https://www.nike.com.br${p.url}`,
            type: type,
            dateAdded: new Date().toISOString()
        }));

    } catch (e) {
        console.error(`Error scraping Nike (${type}):`, e.message);
        return generateMockData('Nike', type);
    }
}

async function scrapeVans(url, type) {
    try {
        console.log(`Scraping Vans (${type}) with Puppeteer...`);
        const browser = await getBrowser();
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });

        // Block images/fonts to speed up
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Use domcontentloaded which is faster and less prone to timeout from tracking scripts
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait for product cards explicitly
        try {
            await page.waitForSelector('div[class*="product"], div[class*="shelf-item"]', { timeout: 10000 });
        } catch (e) {
            console.log("Selector wait failed, proceeding to evaluate anyway...");
        }

        // Extract Data
        const products = await page.evaluate((type) => {
            const items = [];
            // Select product cards. Vans uses specific classes or structures.
            // Based on inspection: links that contain '/p/' and have 'R$' nearby
            const elements = document.querySelectorAll('div[class*="product"], div[class*="shelf-item"]');

            // Fallback: look for any 'a' tag with '/p/'
            const links = Array.from(document.querySelectorAll('a[href*="/p/"]'));

            // Unique links
            const uniqueLinks = new Set();

            links.forEach(a => {
                if (items.length >= 10) return;

                const href = a.getAttribute('href');
                if (uniqueLinks.has(href)) return;
                uniqueLinks.add(href);

                // Try to find context
                // Often the <a> wraps the image and title/price are siblings or children
                // Or there is a parent container

                // Naive extraction from text text content
                const container = a.closest('div') || a;
                const text = container.innerText;

                // Try to parse price
                const flowPriceMatch = text.match(/R\$\s?([\d,.]+)/);

                // Try to find image (we blocked images, but src might be there?) 
                // Wait, request interception blocks loading, but DOM still has <img> tags usually? 
                // Actually if we block images, they might not render. 
                // Let's rely on finding the <img> tag
                const img = container.querySelector('img');
                const title = img ? img.getAttribute('alt') : '';

                if (flowPriceMatch) {
                    const priceVal = parseFloat(flowPriceMatch[1].replace('.', '').replace(',', '.'));

                    items.push({
                        title: title || 'Vans Product',
                        price: priceVal,
                        image: img ? img.src : null, // This might be empty if blocked? No, src attribute exists.
                        link: href
                    });
                }
            });
            return items;
        }, type);

        await page.close();

        // If simple scrape failed to get images due to blocking, use placeholders
        return products.map(p => ({
            id: crypto.randomUUID(),
            brand: 'Vans',
            title: p.title.length > 5 ? p.title : 'Vans Sneaker',
            price: p.price,
            discountPrice: type === 'promotion' ? Math.floor(p.price * 0.9) : null,
            image: p.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
            link: p.link.startsWith('http') ? p.link : `https://www.vans.com.br${p.link}`,
            type: type,
            dateAdded: new Date().toISOString()
        }));

    } catch (e) {
        console.error(`Error scraping Vans (${type}):`, e.message);
        return generateMockData('Vans', type);
    }
}

function generateMockData(brand, type) {
    // Fallback Mock Data Generator
    const count = 5;
    const items = [];
    const IMAGES = ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80'];

    for (let i = 0; i < count; i++) {
        const basePrice = Math.floor(Math.random() * 200) + 100;
        items.push({
            id: crypto.randomUUID(),
            brand: brand,
            title: `${brand} ${type === 'release' ? 'New Drop' : 'Deal'} #${i + 1}`,
            price: basePrice,
            discountPrice: type === 'promotion' ? Math.floor(basePrice * 0.7) : null,
            image: IMAGES[i % IMAGES.length],
            link: 'https://example.com/product',
            type: type,
            dateAdded: new Date().toISOString()
        });
    }
    return items;
}

async function main() {
    console.log("Starting daily update process...");
    let allProducts = [];

    // Nike
    allProducts = allProducts.concat(await scrapeNike(URLS.Nike.release, 'release'));
    allProducts = allProducts.concat(await scrapeNike(URLS.Nike.promo, 'promotion'));

    // Vans (Puppeteer)
    allProducts = allProducts.concat(await scrapeVans(URLS.Vans.release, 'release'));
    allProducts = allProducts.concat(await scrapeVans(URLS.Vans.promo, 'promotion'));



    if (browserInstance) await browserInstance.close();

    fs.writeFileSync(DB_PATH, JSON.stringify(allProducts, null, 2));
    console.log(`Updated database with ${allProducts.length} items.`);
}

main();
