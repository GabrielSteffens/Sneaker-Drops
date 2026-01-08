const axios = require('axios');
const cheerio = require('cheerio');

const URL = "https://www.nike.com.br/nav/tamanho/43/tipodeproduto/calcados?sorting=DescReleaseDate";
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

async function inspectImages() {
    try {
        const { data } = await axios.get(URL, { headers: HEADERS });
        const $ = cheerio.load(data);

        console.log("Searching for product images in DOM...");
        $('img').each((i, el) => {
            if (i < 20) {
                const src = $(el).attr('src');
                const alt = $(el).attr('alt');
                const className = $(el).attr('class');
                if (src && src.startsWith('http')) {
                    console.log(`IMG ${i}:`, src.substring(0, 100));
                }
            }
        });

    } catch (e) {
        console.error("Error:", e.message);
    }
}

inspectImages();
