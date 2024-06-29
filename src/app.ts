import puppeteer from "puppeteer";

import { env } from "./config/env";
// import { testSaveFile } from "./test";
import { getHistory, getProducts, setHistory } from "./utils";
import { saveImageFromUrl } from "./utils/saveImageFromByUrl";
import { saveProductPropsFromPage } from "./utils/saveProductPropsFromPage";

// testSaveFile();

const main = async () => {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
    headless: false,
    ignoreDefaultArgs: ["--disable-extensions"],
  });

  const page = await browser.newPage();

  // let pageUrl: string = page.url();

  // page.on("response", (response) => {
  //   pageUrl = response.url();
  // });

  page.setDefaultTimeout(0);
  page.setDefaultNavigationTimeout(0);

  await page.goto(
    "https://www.stylus.co.ao/encomendas/pt/inicio-de-sessao?back=my-account"
  );

  const loginDone = (): boolean => {
    // console.log("Page url after login => ", new URL(pageUrl).pathname);
    // return new URL(pageUrl).pathname.replace(/\/$/, "") === "/encomendas/pt";
    return true;
  };

  const EMAIL_FIELD_ID = "email";
  const PASSWORD_FIELD_IS = "passwd";

  const emailField = await page.waitForSelector(`input#${EMAIL_FIELD_ID}`);
  const passwordField = await page.waitForSelector(
    `input#${PASSWORD_FIELD_IS}`
  );

  if (emailField) {
    await emailField.type(env.STYLUS_SITE_USERNAME);
  }

  if (passwordField) {
    await passwordField.type(env.STYLUS_SITE_PASSWORD);
  }

  const loginButton = await page.waitForSelector("#SubmitLogin");

  if (loginButton) {
    await loginButton.click();

    if (loginDone()) {
      console.log("Login done >>> Start getting images");

      console.log("\nGetting products data from Anluge store API...\n");

      const allProducts = await getProducts();
      const history = getHistory();

      console.log(
        `\n\n\nHISTORY\n\n-> Already downloaded images: #${history.success.length}\n-> Failures: #${history.failure.length}\n\n\n`
      );

      const products = allProducts.filter(
        (product) => !history.success.some(({ code }) => code === product.code)
      );

      console.log(`\n\nGetting images for #${products.length} products...\n\n`);

      let index = -1;

      for (const product of products) {
        index++;

        try {
          console.log(`\n\n\n\nProduct id => ${product.code} #${index}`);

          // Obter imagem do produto pelo código
          // enviar imagem para a cdn

          // { id: string }

          console.log(`[${product.name}] Getting search form field...`);

          const searchInputField = await page.waitForSelector(
            "form#searchbox div.input-group input#pts_search_query_top"
          );

          const searchButtonElement = await page.waitForSelector(
            "form#searchbox div.input-group button.button-search"
          );

          if (!(searchInputField && searchButtonElement)) {
            setHistory(product, "failure");
            continue;
          }

          console.log(`[${product.name}] Typing search query...`);

          await searchInputField.evaluate((element, productCode) => {
            const inputField = document.querySelector<HTMLInputElement>(
              "form#searchbox div.input-group input#pts_search_query_top"
            );

            console.log("\n\n\nproductCode => ", productCode, "\n\n\n\n");

            if (inputField) {
              inputField.value = productCode;
            }
          }, product.code);

          // await searchInputField.type(product.code, {
          //   delay: 300,
          // });

          await searchButtonElement.click();

          // await page.waitForNavigation({
          //   waitUntil: "load",
          // });

          const productPageLinkElement = await page.waitForSelector(
            "h4.name > a.product-name"
          );

          console.log(`[${product.name}] Going to the product page...`);

          if (!productPageLinkElement) {
            console.log(
              `[${product.name}] Failed going to the product page...`
            );
            console.log(
              `\n\nCould not find product link element for product '${product.name}'\n\n`
            );

            setHistory(product, "failure");

            continue;
          }

          const productPageUrl = (
            await productPageLinkElement.getProperty("href")
          )
            .toString()
            .replace(/^(JSHandle:)/i, "");

          console.log(`[${product.name}] product page url: ${productPageUrl}`);

          // productPageLinkElement.clickablePoint

          // await productPageLinkElement.click();

          await page.goto(productPageUrl, {
            waitUntil: "load",
            timeout: 0,
          });

          // await page.waitForNavigation({
          //   waitUntil: "load",
          // });

          console.log(`[${product.name}] Getting main image url...`);

          const mainImageUrl = await page.evaluate(() => {
            const mainImageElement =
              document.querySelector<HTMLImageElement>("img#bigpic");

            if (!mainImageElement) {
              return null;
            }

            return String(mainImageElement.src);
          });

          // const mainImageElement = await page.waitForSelector("img#bigpic");

          console.log(`[${product.name}] Got main image url...`);

          if (mainImageUrl && /\S/.test(mainImageUrl)) {
            await saveImageFromUrl(product, mainImageUrl);

            console.log(`[${product.name}] Getting alternates images urls...`);

            const productAlternatesImagesUrls = await page.evaluate(() => {
              const productAlternatesImagesElements =
                document.querySelectorAll<HTMLImageElement>(
                  [
                    // "div.primary_block",
                    // "div.pb-left-column",
                    // "div#views_block",
                    "div#thumbs_list",
                    "img",
                  ].join(" ")
                );

              if (productAlternatesImagesElements.length >= 1) {
                const productAlternatesImagesSources = Array.from(
                  productAlternatesImagesElements
                ).map((imageElement) => {
                  const re = /([0-9]+)-cart_default/i;
                  const reMatch = re.exec(imageElement.src);

                  if (reMatch) {
                    const [, imageSourceToken] = reMatch;

                    return imageElement.src.replace(
                      re,
                      `${imageSourceToken}-thickbox_default`
                    );
                  }

                  return imageElement.src;
                });

                return productAlternatesImagesSources;
              }
            });

            if (productAlternatesImagesUrls instanceof Array) {
              console.log(
                `[${product.name}] Got alternates images url. Start saving.`
              );

              let imageIndex = -1;

              for (const productAlternateImageUrl of productAlternatesImagesUrls) {
                imageIndex++;

                console.log(
                  `\n[${product.name}] Saving alternate image #${imageIndex}...`
                );
                await saveImageFromUrl(product, productAlternateImageUrl);
              }
            } else {
              console.log(
                `[${product.name}] Failure getting alternate images or nothing found.`,
                { productAlternatesImagesUrls }
              );
            }

            await saveProductPropsFromPage(product, page);
          } else {
            await saveProductPropsFromPage(product, page);

            await page.goBack({
              waitUntil: "domcontentloaded",
            });

            const alternateProductImageUrl = await page.evaluate(() => {
              const alternateProductImageElement =
                document.querySelector<HTMLImageElement>(
                  "div.product-meta a.fancybox img.img_prod_list"
                );

              if (alternateProductImageElement) {
                return /\S/.test(alternateProductImageElement.src)
                  ? alternateProductImageElement.src
                  : null;
              }

              return null;
            });

            if (alternateProductImageUrl) {
              await saveImageFromUrl(product, alternateProductImageUrl);
              continue;
            }

            console.log(
              `[${product.name}] Failure getting main image url (${mainImageUrl}).`
            );

            setHistory(product, "failure");
          }
        } catch (err) {
          setHistory(product, "failure");
        }
      }
    } else {
      console.log("Failed to login with given credentials");
    }
  }

  return browser;
};

main().then((browser) => {
  console.log("\n\n\n\nEND\n\n\n\n");

  const history = getHistory();

  console.log(
    `\n\n\n\n\n\nSuccesses: ${history.success.length}\nFailures: ${history.failure.length}`
  );

  console.log(`\n\n\n\n\nAll imported products images:`);
  console.table(
    history.success.map((product) => ({
      code: product.code,
      id: product.id,
      name: product.name,
    }))
  );

  browser.close();
});
