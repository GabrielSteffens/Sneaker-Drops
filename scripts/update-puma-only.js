const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const DB_PATH = path.join(__dirname, '../lib/products.json');

const PUMA_URLS = {
    release: "https://br.puma.com/lancamentos?limit=16&refine=c_productDivision%3DCal%C3%A7ados&sort=best-matches",
    promo: "https://br.puma.com/outlet/homens/calcados"
};

async function getBrowser() {
    return await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
}

async function scrapePumaSingle(url, type) {
    console.log(`Scraping Puma (${type}) single pass: ${url}...`);
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    const items = [];
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Scroll to load all items
        await page.evaluate(async () => {
            const distance = 100;
            const delay = 100;
            const MAX_SCROLLS = 300; // Increase this for more products (30s scroll)

            for (let i = 0; i < MAX_SCROLLS; i++) {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                await new Promise(resolve => setTimeout(resolve, delay));

                // Break if we are at bottom
                if ((window.innerHeight + window.scrollY) >= scrollHeight) {
                    // small wait to see if more loads
                    await new Promise(resolve => setTimeout(resolve, 500));
                    if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight) {
                        break;
                    }
                }
            }
        });

        // Wait for final rendering
        await new Promise(r => setTimeout(r, 2000));

        const products = await page.evaluate(() => {
            const extracted = [];
            const cards = document.querySelectorAll('.css-v5fr4o');

            if (cards.length === 0) {
                return [{ debug: true, bodyLength: document.body.innerText.length }];
            }

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
                    price = 999.99; // Mock price if missing
                }

                // FIX: Image is in parent/sibling container
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
                    rawText: text.substring(0, 100)
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
        await browser.close();
    }

    console.log(`Found ${items.length} items.`);
    return items;
}

async function main() {
    let allProducts = [];
    try {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        allProducts = JSON.parse(raw);
    } catch (e) {
        allProducts = [];
    }

    allProducts = allProducts.filter(p => p.brand !== 'Puma');

    const pumaRelease = await scrapePumaSingle(PUMA_URLS.release, 'release');
    const pumaPromo = await scrapePumaSingle(PUMA_URLS.promo, 'promotion');

    allProducts = allProducts.concat(pumaRelease);
    allProducts = allProducts.concat(pumaPromo);

    fs.writeFileSync(DB_PATH, JSON.stringify(allProducts, null, 2));
    console.log(`Updated database with ${allProducts.length} total items.`);
}

main();
