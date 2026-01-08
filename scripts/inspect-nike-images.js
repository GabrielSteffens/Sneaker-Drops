const axios = require('axios');
const cheerio = require('cheerio');

const URL = "https://www.nike.com.br/nav/tamanho/43/tipodeproduto/calcados?sorting=DescReleaseDate";
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

async function inspectNikeImages() {
    try {
        const { data } = await axios.get(URL, { headers: HEADERS });
        const $ = cheerio.load(data);
        const scriptContent = $('#__NEXT_DATA__').html();

        if (!scriptContent) {
            console.log("No NEXT_DATA found.");
            return;
        }

        const json = JSON.parse(scriptContent);
        const products = json.props.pageProps.data?.products || [];

        if (products.length > 0) {
            console.log("Found products. Dumping first item structure:");
            console.log(JSON.stringify(products[0], null, 2));

            // Check if there are other image fields
            const p = products[0];
            console.log("\nPotential Image Fields:");
            Object.keys(p).forEach(k => {
                if (k.toLowerCase().includes('image') || k.toLowerCase().includes('img') || k.toLowerCase().includes('asset')) {
                    console.log(`${k}:`, p[k]);
                }
            });
        } else {
            console.log("No products found in data.");
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}

inspectNikeImages();
