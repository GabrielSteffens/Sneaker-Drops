const axios = require('axios');
const cheerio = require('cheerio');

const URL = "https://www.adidas.com.br/calcados-homem-novidades?v_size_pt_br=43%7C42_43";

async function inspect() {
    try {
        const { data } = await axios.get(URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        console.log("Title:", $('title').text());

        // Find element with price
        const priceEl = $('*:contains("R$")').filter((i, el) => $(el).children().length === 0).last();

        if (priceEl.length) {
            console.log("Found price element text:", priceEl.text().trim().substring(0, 20));
            console.log("Price element tag:", priceEl.prop('tagName'));
            console.log("Price element class:", priceEl.attr('class'));
            console.log("Price element parent class:", priceEl.parent().attr('class'));

            // Traverse up to find a likely card container (e.g. div)
            let parent = priceEl.parent();
            for (let i = 0; i < 5; i++) {
                if (parent.prop('tagName') === 'DIV') {
                    console.log(`Parent ${i} class:`, parent.attr('class'));
                }
                parent = parent.parent();
            }
        } else {
            console.log("Could not find 'R$' text.");
        }

        // Dump all links that look like products
        $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (href && href.includes('/p/')) {
                if (i < 3) console.log("Product Link:", href);
            }
        });

    } catch (e) {
        console.error("Error:", e.message);
    }
}

inspect();
