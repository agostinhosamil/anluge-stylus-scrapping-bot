import puppeteer from "puppeteer";

import { env } from "./config/env";
import { getProducts } from "./utils";

const main = async () => {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();

  await page.goto(
    "https://www.stylus.co.ao/encomendas/pt/inicio-de-sessao?back=my-account"
  );

  const loginDone = (): boolean => {
    return page.url() === "https://www.stylus.co.ao/encomendas/pt/";
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
      }
    }
  }

  return browser;
};

main().then(() => {
  // browser.close();
});
