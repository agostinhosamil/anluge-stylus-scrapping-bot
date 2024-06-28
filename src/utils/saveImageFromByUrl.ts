import fs from "node:fs/promises";
import path from "node:path";

import { getImageFileElementFromUrl, setHistory } from ".";
import { Product } from "../types";

export const saveImageFromUrl = async (
  product: Product,
  mainImageUrl: string
): Promise<void> => {
  // const mainImageUrl = await mainImageElement.getProperty("src");

  console.log(`[${product.name}] Getting main image buffer object...`);

  const mainImageButterObject = await getImageFileElementFromUrl(
    mainImageUrl // .toString().replace(/^(JSHandle:)/i, "")
  );

  const sanitizedProductName = product.name
    .replaceAll(/\s+/g, "-")
    .replaceAll(/[^a-zA-Z0-9_-]/g, "");

  const imageName = `[${Date.now()}] ${sanitizedProductName} - (${encodeURIComponent(
    product.code
  )}).jpg`;

  const imagePath = path.resolve(
    __dirname,
    "..",
    "assets",
    "images",
    imageName
  );

  if (!mainImageButterObject) {
    console.log(`[${product.name}] Failed getting main image buffer object...`);

    setHistory(product, "failure");

    return;
  }

  console.log(`[${product.name}] Saving image...`);

  // @ts-ignore
  await fs.writeFile(imagePath, mainImageButterObject);

  console.log(
    `[${product.name}] Saved image at: ${imagePath}`.concat("\n".repeat(10))
  );

  setHistory(product);

  // TODO: Get Image Variants
};
