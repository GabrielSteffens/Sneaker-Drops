const axios = require('axios');
const cheerio = require('cheerio');

const TARGET_URL = "https://www.adidas.com.br/calcados-homem-novidades";
const CACHE_URL = `http://webcache.googleusercontent.com/search?q=cache:${TARGET_URL}`;

async function checkCache() {
    try {
        console.log("Fetching Google Cache for Adidas...");
        const { data } = await axios.get(CACHE_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const title = $('title').text();
        console.log("Cache Title:", title);

        if (title.includes('Error') || title.includes('404')) {
            console.log("Cache not available or blocked.");
        } else {
            console.log("Cache seems valid (or at least loaded something).");
            // Try to find products
            const products = [];
            $('.glass-product-card').each((i, el) => {
                products.push($(el).text().substring(0, 50));
            });
            console.log("Products found in cache:", products.length);
            if (products.length > 0) console.log(products.slice(0, 3));
        }

    } catch (e) {
        console.log("Error fetching cache:", e.message);
        if (e.response) {
            console.log("Status:", e.response.status);
        }
    }
}

checkCache();
