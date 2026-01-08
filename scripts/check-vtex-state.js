const axios = require('axios');
const cheerio = require('cheerio');

const URL = "https://www.vans.com.br/c/novidades?q=:creation-time:shoeSize:43&page=0";
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

async function checkState() {
    try {
        const { data } = await axios.get(URL, { headers: HEADERS });
        const $ = cheerio.load(data);

        $('script').each((i, el) => {
            const html = $(el).html();
            if (html && html.includes('__STATE__')) {
                console.log("Found __STATE__ script! Length:", html.length);
                console.log("Snippet:", html.substring(0, 100));
            }
        });

    } catch (e) {
        console.error(e.message);
    }
}

checkState();
