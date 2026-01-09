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
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
    return browserInstance;
}

async function scrapeNike(baseUrl, type) {
    const SIZES = [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];
    const productMap = new Map();

    console.log(`Scraping Nike (${type}) across sizes: ${SIZES.join(', ')}...`);

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
        await new Promise(r => setTimeout(r, 200));
    }

    const aggregatedProducts = Array.from(productMap.values()).map(p => ({
        ...p,
        availableSizes: Array.from(p.availableSizes).sort((a, b) => a - b)
    }));

    console.log(`Aggregated ${aggregatedProducts.length} unique Nike ${type} products.`);
    return aggregatedProducts;
}

async function scrapeVans(baseUrl, type) {
    const SIZES = [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];
    const MAX_SAFE_PAGES = 50;
    const productMap = new Map();

    console.log(`Scraping Vans (${type}) across sizes: ${SIZES.join(', ')}...`);

    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        await page.setViewport({ width: 1366, height: 768 });
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        for (const size of SIZES) {
            let pageNum = 0;
            while (pageNum < MAX_SAFE_PAGES) {
                let url;
                if (type === 'promotion') {
                    url = `https://www.vans.com.br/c/promocao?q=:creation-time:category:SAPATOS:shoeSize:${size}&page=${pageNum}`;
                } else {
                    url = `https://www.vans.com.br/c/novidades?q=:creation-time:shoeSize:${size}&page=${pageNum}`;
                }

                try {
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
                    try {
                        await page.waitForSelector('div[class*="product"], div[class*="shelf-item"]', { timeout: 3000 });
                    } catch (e) { }

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
                                link: p.link.startsWith('http') ? p.link : `https://www.vans.com.br${p.link}`,
                                type: type,
                                availableSizes: new Set(),
                                dateAdded: new Date().toISOString()
                            });
                        }
                        productMap.get(id).availableSizes.add(size);
                    }
                    pageNum++;
                } catch (e) {
                    break;
                }
            }
        }
    } catch (e) { }

    const aggregatedProducts = Array.from(productMap.values()).map(p => ({
        ...p,
        availableSizes: Array.from(p.availableSizes).sort((a, b) => a - b)
    }));

    console.log(`Aggregated ${aggregatedProducts.length} unique Vans ${type} products.`);
    return aggregatedProducts;
}

async function scrapePuma(url, type) {
    console.log(`Scraping Puma (${type}) single pass: ${url}...`);
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    const items = [];
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Scroll Logic
        await page.evaluate(async () => {
            const distance = 100;
            const delay = 100;
            const MAX_SCROLLS = 300;

            for (let i = 0; i < MAX_SCROLLS; i++) {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                await new Promise(resolve => setTimeout(resolve, delay));
                if ((window.innerHeight + window.scrollY) >= scrollHeight) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight) {
                        break;
                    }
                }
            }
        });

        await new Promise(r => setTimeout(r, 2000));

        const products = await page.evaluate(() => {
            const extracted = [];
            const cards = document.querySelectorAll('.css-v5fr4o');
            if (cards.length === 0) return [{ debug: true, bodyLength: document.body.innerText.length }];

            cards.forEach(card => {
                const linkEl = card.querySelector('a');
                const link = linkEl ? linkEl.href : '#';

                const titleEl = card.querySelector('h3');
                const title = titleEl ? titleEl.innerText : 'Puma Product';

                const text = card.innerText;
                const priceMatch = text.match(/R\$\s?([\d,.]+)/);
                let price = 0;
                if (priceMatch) {
                    price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
                } else {
                    price = 999.99;
                }

                const parent = card.parentElement;
                let image = null;
                if (parent) {
                    const imgEl = parent.querySelector('img');
                    if (imgEl) image = imgEl.src;
                }

                extracted.push({
                    title,
                    price,
                    image,
                    link,
                    rawText: text.substring(0, 50)
                });
            });
            return extracted;
        });

        if (products.length > 0 && products[0].debug) {
            console.log(`  -> Found 0 items (debug body len: ${products[0].bodyLength})`);
        } else {
            console.log(`  -> Extracted ${products.length} items.`);
            products.forEach(p => {
                const id = crypto.createHash('md5').update(p.link + p.title).digest('hex').substring(0, 8);
                items.push({
                    id: id,
                    brand: 'Puma',
                    title: p.title,
                    price: p.price,
                    discountPrice: type === 'promotion' ? Math.floor(p.price * 0.9) : null,
                    image: p.image || 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=600&q=80',
                    link: p.link,
                    type: type,
                    availableSizes: [34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44],
                    dateAdded: new Date().toISOString()
                });
            });
        }
    } catch (e) {
        console.error(`Error scraping Puma: ${e.message}`);
    } finally {
        await page.close();
    }
    console.log(`Aggregated ${items.length} unique Puma ${type} products.`);
    return items;
}

async function main() {
    console.log("Starting daily update process...");
    let allProducts = [];

    // Puma
    allProducts = allProducts.concat(await scrapePuma(URLS.Puma.release, 'release'));
    allProducts = allProducts.concat(await scrapePuma(URLS.Puma.promo, 'promotion'));

    // Nike
    allProducts = allProducts.concat(await scrapeNike(URLS.Nike.release, 'release'));
    allProducts = allProducts.concat(await scrapeNike(URLS.Nike.promo, 'promotion'));

    // Vans
    allProducts = allProducts.concat(await scrapeVans(URLS.Vans.release, 'release'));
    allProducts = allProducts.concat(await scrapeVans(URLS.Vans.promo, 'promotion'));

    if (browserInstance) await browserInstance.close();

    fs.writeFileSync(DB_PATH, JSON.stringify(allProducts, null, 2));
    console.log(`Updated database with ${allProducts.length} items.`);
}

main();
