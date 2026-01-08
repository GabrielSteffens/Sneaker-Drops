
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const URL = "https://www.adidas.com.br/calcados-homem-novidades";

async function debugAdidas() {
    console.log("Launching Stealth Browser for Adidas...");
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    try {
        const page = await browser.newPage();

        // Pass the Webdriver Test
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3],
            });
            Object.defineProperty(navigator, 'languages', {
                get: () => ['pt-BR', 'pt', 'en-US', 'en'],
            });
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // Add Referer
        await page.setExtraHTTPHeaders({
            'Referer': 'https://www.google.com.br/',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        });

        console.log("Navigating...");
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait a bit resembling human
        await new Promise(r => setTimeout(r, 5000));

        const title = await page.title();
        console.log("Page Title:", title);

        // Check for specific Adidas elements
        const glassHeader = await page.$('.gl-heading');
        if (glassHeader) {
            console.log("Found gl-heading. Likely Success.");
            const text = await page.evaluate(el => el.innerText, glassHeader);
            console.log("Header text:", text);
        } else {
            console.log("gl-heading NOT found.");
        }

        const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
        console.log("Body excerpt:", bodyText);

    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await browser.close();
    }
}

debugAdidas();
