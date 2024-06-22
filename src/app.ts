import fs from "node:fs/promises";
import path from "node:path";

import puppeteer from "puppeteer";

import { env } from "./config/env";
// import { testSaveFile } from "./test";
import { getImageFileElementFromUrl, getProducts } from "./utils";

// testSaveFile();

const main = async () => {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();

  let pageUrl: string = page.url();

  page.on("response", (response) => {
    pageUrl = response.url();
  });

  page.setDefaultTimeout(1000 * 60 * 0);
  page.setDefaultNavigationTimeout(1000 * 60 * 0);

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

      const products = await getProducts();

      for (const product of products) {
        console.log(`Product id => ${product.code}`);

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
          continue;
        }

        console.log(`[${product.name}] Typing search query...`);

        await searchInputField.type(product.code);

        await searchButtonElement.click();

        await page.waitForNavigation({
          waitUntil: "load",
        });

        const productPageLinkElement = await page.waitForSelector(
          "h4.name > a.product-name"
        );

        console.log(`[${product.name}] Going to the product page...`);

        if (!productPageLinkElement) {
          console.log(`[${product.name}] Failed going to the product page...`);
          console.log(
            `\n\nCould not find product link element for product '${product.name}'\n\n`
          );

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

        await page.goto(productPageUrl);

        // await page.waitForNavigation({
        //   waitUntil: "load",
        // });

        console.log(`[${product.name}] Getting main image url...`);

        const mainImageElement = await page.waitForSelector("img#bigpic");

        if (mainImageElement) {
          const mainImageUrl = await mainImageElement.getProperty("src");

          console.log(`[${product.name}] Getting main image buffer object...`);

          const mainImageButterObject = await getImageFileElementFromUrl(
            mainImageUrl.toString().replace(/^(JSHandle:)/i, "")
          );

          const sanitizedProductName = product.name.replaceAll(
            /[^a-zA-Z0-9_-]/g,
            ""
          );

          const imageName = `[${Date.now()}] ${sanitizedProductName} - (${
            product.code
          }).jpg`;

          const imagePath = path.resolve(
            __dirname,
            "assets",
            "images",
            imageName
          );

          if (!mainImageButterObject) {
            console.log(
              `[${product.name}] Failed getting main image buffer object...`
            );

            continue;
          }

          console.log(`[${product.name}] Saving image...`);
          // @ts-ignore
          await fs.writeFile(imagePath, mainImageButterObject);

          console.log(
            `[${product.name}] Saved image at: ${imagePath}`.concat(
              "\n".repeat(10)
            )
          );

          // TODO: Get Image Variants
        }
      }
    } else {
      console.log("Failed to login with given credentials");
    }
  }

  return browser;
};

main().then(() => {
  // browser.close();
});
