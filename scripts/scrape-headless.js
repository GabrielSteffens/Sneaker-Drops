
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const URLS = {
    Adidas: "https://www.adidas.com.br/calcados-homem-novidades?v_size_pt_br=43%7C42_43",
    Vans: "https://www.vans.com.br/c/novidades?q=:creation-time:shoeSize:43&page=0"
};

async function testScrape() {
    console.log("Launching Headless Browser...");
    // Try to launch chrome. In some container envs this might fail if libs are missing.
    // If it fails, that's a finding.

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for some cloud envs
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });

        // Test Adidas
        console.log("Navigating to Adidas...");
        await page.goto(URLS.Adidas, { waitUntil: 'networkidle2', timeout: 30000 });
        const titleAdidas = await page.title();
        console.log("Adidas Title:", titleAdidas);

        if (titleAdidas.includes("Access Denied") || titleAdidas.includes("403")) {
            console.log("Adidas: BLOCKED");
        } else {
            console.log("Adidas: SUCCESS?");
            // Dump first H1
            const h1 = await page.evaluate(() => document.querySelector('h1')?.innerText);
            console.log("Adidas H1:", h1);
        }

        // Test Vans
        console.log("\nNavigating to Vans...");
        await page.goto(URLS.Vans, { waitUntil: 'networkidle2', timeout: 30000 });
        const titleVans = await page.title();
        console.log("Vans Title:", titleVans);

        // Find product names
        const names = await page.evaluate(() => {
            // Look for generic product things
            const items = Array.from(document.querySelectorAll('a, div')).filter(el => el.innerText && el.innerText.includes('R$'));
            return items.slice(0, 3).map(el => el.innerText.substring(0, 50));
        });
        console.log("Vans Items Found:", names);

    } catch (e) {
        console.error("Puppeteer Error:", e.message);
    } finally {
        if (browser) await browser.close();
    }
}

testScrape();
