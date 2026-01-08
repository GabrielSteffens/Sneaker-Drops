const axios = require('axios');
const cheerio = require('cheerio');

const URL = "https://www.vans.com.br/c/novidades?q=:creation-time:shoeSize:43&page=0";

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

async function findPath() {
    try {
        const { data } = await axios.get(URL, { headers: HEADERS });
        const $ = cheerio.load(data);

        let json = null;
        // Find the script with data. 
        // inspect-vans found it has "pageProps"
        $('script').each((i, el) => {
            const html = $(el).html();
            if (html && html.includes('pageProps')) {
                try {
                    json = JSON.parse(html);
                } catch (e) { }
            }
        });

        if (json) {
            console.log("JSON Parsed. Searching for 'R$'...");
            findValue(json, 'ROOT');
        } else {
            console.log("JSON not found.");
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}

function findValue(obj, path) {
    if (!obj || typeof obj !== 'object') {
        if (typeof obj === 'string' && obj.includes('R$')) {
            console.log(`FOUND PRICE AT: ${path} = ${obj}`);
        }
        return;
    }

    // Limit depth/breadth to avoid infinite
    if (path.length > 200) return;

    for (const key in obj) {
        findValue(obj[key], `${path}.${key}`);
    }
}

findPath();
