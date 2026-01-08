const axios = require('axios');
const cheerio = require('cheerio');

const URLS = {
    Vans: "https://www.vans.com.br/c/novidades?q=:creation-time:shoeSize:43&page=0",
    Nike: "https://www.nike.com.br/nav/tamanho/43/tipodeproduto/calcados?sorting=DescReleaseDate"
};

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

async function inspect(brand, url) {
    try {
        console.log(`\nInspecting ${brand}...`);
        const { data } = await axios.get(url, { headers: HEADERS });
        const $ = cheerio.load(data);

        let json = null;
        $('script').each((i, el) => {
            const html = $(el).html();
            if (html && html.includes('pageProps') && (html.includes('products') || html.includes('items'))) {
                try {
                    // It might be inside a variable assignment or just raw JSON
                    // Often it is wrapped in <script id="__NEXT_DATA__" type="application/json">
                    if ($(el).attr('id') === '__NEXT_DATA__') {
                        json = JSON.parse(html);
                    }
                } catch (e) { }
            }
        });

        if (json) {
            console.log(`${brand} found NEXT_DATA.`);
            const props = json.props.pageProps;
            console.log(`${brand} keys:`, Object.keys(props));

            // Try to find products in common paths
            let products = props.products || props.initialState?.products || props.dehydratedState?.queries?.[0]?.state?.data?.products;

            // Fallbacks for specific sites
            if (brand === 'Vans') {
                // Inspect deeper if not found on root
            }

            // Dump a sample if found
            // Just print the whole structure keys recursively to find 'products'
            printKeys(props, 0, 3);

        } else {
            console.log(`${brand} NEXT_DATA NOT FOUND directly.`);
            // Search for other scripts
            $('script').each((i, el) => {
                if ($(el).html().includes('R$')) console.log("Found script with price but no ID");
            });
        }

    } catch (e) {
        console.error(`${brand} error:`, e.message);
    }
}

function printKeys(obj, depth, maxDepth) {
    if (depth > maxDepth || !obj || typeof obj !== 'object') return;
    const keys = Object.keys(obj);
    console.log('  '.repeat(depth) + keys.join(', ').substring(0, 100));
    for (const key of keys) {
        if (key === 'products' || key === 'items' || key === 'records') {
            console.log('  '.repeat(depth) + `FOUND ${key}! (Length/Type: ${Array.isArray(obj[key]) ? obj[key].length : typeof obj[key]})`);
            if (Array.isArray(obj[key]) && obj[key].length > 0) {
                console.log('  '.repeat(depth) + "Sample Item:", JSON.stringify(obj[key][0]).substring(0, 200));
            }
        }
        if (typeof obj[key] === 'object') {
            printKeys(obj[key], depth + 1, maxDepth);
        }
    }
}

async function main() {
    await inspect('Vans', URLS.Vans);
    await inspect('Nike', URLS.Nike);
}

main();
