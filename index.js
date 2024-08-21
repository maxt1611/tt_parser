const puppeteer = require('puppeteer');
const fs = require('fs');

async function parseProduct(url, region) {
  /* global document, window */
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.setViewport({ width: 1366, height: 768 });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

  // можно использовать domcontentloaded для более быстрой итерации, но не гарантируется корректная работа
  await page.waitForNavigation({ waitUntil: 'load', timeout: 0 });

  // пропускаем если регион Москва и область, т.к. он дефолтный
  if (region !== 'Москва и область') {
    // клик кнопки регионов
    await page.waitForSelector('.UiHeaderHorizontalBase_region__2ODCG', {
      visible: true,
      timeout: 0,
    });
    await page.click('.UiHeaderHorizontalBase_region__2ODCG');

    await page.waitForSelector('.UiRegionListBase_list__cH0fK', {
      visible: true,
      timeout: 0,
    });

    // выбор региона в модалке
    const regionFound = await page.evaluate(async (region) => {
      const regionItems = Array.from(
        document.querySelectorAll('.UiRegionListBase_item___ly_A')
      );
      const targetRegion = regionItems.find(
        (item) => item.innerText.trim() === region
      );

      if (targetRegion) {
        targetRegion.click();
        return true;
      } else {
        return false;
      }
    }, region);

    if (!regionFound) {
      console.error('Region not found:', region);
      await browser.close();
      return;
    }

    await page.waitForNavigation({ waitUntil: 'load', timeout: 0 });
  }

  // прокрутка вниз для загрузки всех элементов
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });

  // быстрая прокрутка вверх перед снятием скриншота
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
  });

  // скрываем лишнее
  await page.evaluate(() => {
    const secondHeader = document.querySelector('.StickyPortal_root__5NZsr');
    if (secondHeader) {
      secondHeader.style.display = 'none';
    }

    const tooltip = document.querySelector('.Tooltip_root__EMk_3');
    if (tooltip) {
      tooltip.style.display = 'none';
    }

    const cookieAlert = document.querySelector('.CookiesAlert_policy__1ClsP');
    if (cookieAlert) {
      cookieAlert.style.display = 'none';
    }
  });

  // скриншот
  await page.screenshot({ path: 'screenshot.jpg', fullPage: true });

  // сбор данных о товаре
  const productInfo = await page.evaluate(() => {
    let price = document.querySelector(
      '.Price_price__QzA8L.Price_size_XL__MHvC1.Price_role_discount__l_tpE'
    );
    if (!price)
      price = document.querySelector(
        '.Price_price__QzA8L.Price_size_XL__MHvC1.Price_role_regular__X6X4D'
      );

    const oldPrice = document.querySelector(
      '.Price_price__QzA8L.Price_size_XS__ESEhJ.Price_role_old__r1uT1'
    );
    const rating = document.querySelector(
      '.Summary_title__lRoWU[itemprop="ratingValue"]'
    );
    const reviews = document.querySelector('.ActionsRow_reviews__AfSj_');

    return {
      price: price ? price.innerText : null,
      oldPrice: oldPrice ? oldPrice.innerText : null,
      rating: rating ? rating.innerText : null,
      reviews: reviews ? reviews.innerText.match(/\d+/)[0] : null,
    };
  });

  const price = productInfo.price ? parseInt(productInfo.price) : null;
  const oldPrice = productInfo.oldPrice ? parseInt(productInfo.oldPrice) : null;
  const reviews = productInfo.reviews ? parseInt(productInfo.reviews) : null;

  const productData = `price=${price || 'N/A'}\npriceOld=${oldPrice || 'N/A'}\nrating=${productInfo.rating || 'N/A'}\nreviewCount=${reviews || 'N/A'}`;

  // сохраняем txt
  fs.writeFileSync('product.txt', productData.trim());

  await browser.close();
}

function parseInt(text) {
  let cleanedText = text.replace(/[^\d,.-]/g, '');
  cleanedText = cleanedText.replace(',', '.');
  const price = parseFloat(cleanedText);

  return price;
}

const [url, region] = process.argv.slice(2);

if (!url || !region) {
  console.log('Usage: node index.js <URL> <Region>');
  process.exit(1);
}

parseProduct(url, region).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
